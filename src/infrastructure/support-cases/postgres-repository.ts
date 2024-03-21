import { connect, Client, Configuration, SSLMode } from 'ts-postgres';
import { SupportCasesRepository } from "../../domain/support-cases/repository";
import { SupportCase } from "../../domain/support-cases/support-case";
import { SupportCaseId } from "../../domain/support-cases/support-case-id";
import { OptimisticConcurrencyError } from "../../domain/core/optimistic-concurrency-error";
import { SupportCaseDomainEvent } from '../../domain/support-cases/domain-events';
import { EventPublisher } from '../../domain/core/event-publisher';

export class PostgresSupportCasesRepository implements SupportCasesRepository {
    private dbConfig: Configuration;
    private outboxDest: EventPublisher;

    constructor(host: string,
        port: number,
        user: string,
        password: string,
        database: string,
        outboxDest: EventPublisher) {
        this.dbConfig = {
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        }

        this.outboxDest = outboxDest;
    }

    async save(supportCase: SupportCase): Promise<void> {
        let id = supportCase.id;
        let data = supportCase.toJSON();
        let version = supportCase.version + 1;

        let client = await this.connect();

        try {
            console.log("saving")
            await client.query('BEGIN');

            let query: string = "";
            if (version === 1) {
                query = 'INSERT INTO wolfdesk.support_cases(agg_id, case_data, case_version) VALUES($1, $2, $3)';
            } else {
                query = 'UPDATE wolfdesk.support_cases SET case_data = $2, case_version = $3 WHERE agg_id = $1 AND case_version = $3 - 1 RETURNING *';
            }
            const result = await client.query(query, [id, data, version]);
            if (version !== 1 && result.rows.length === 0) {
                throw new OptimisticConcurrencyError(id, version - 1);
            }
            
            let outboxEvents = await this.pushToOutbox(client, supportCase);
            //await this.tryToPublishOutboxEvents(client, outboxEvents);
            await client.query('COMMIT');
            supportCase.committed();
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            await client.end();
        }
    }

    async load(id: SupportCaseId): Promise<SupportCase> {
        let client = await this.connect();

        try {
            let query: string = "SELECT case_data, case_version FROM wolfdesk.support_cases WHERE agg_id = $1";
            const result = await client.query(query, [id]);

            for await (const obj of result) {
                return SupportCase.fromJSON(obj.case_data, obj.case_version);
            }

            throw new Error(`Support case with id ${id} not found`);
        } finally {
            await client.end();
        }
    }

    async loadAll(): Promise<SupportCase[]> {
        let client = await this.connect();

        try {
            let query: string = "SELECT case_data, case_version FROM wolfdesk.support_cases ORDER BY case_data->>'_createdOn' DESC;";
            const result = await client.query(query);

            const supportCases: SupportCase[] = [];
            for await (const obj of result) {
                const supportCase = SupportCase.fromJSON(obj.case_data, obj.case_version);
                supportCases.push(supportCase);
            }
            return supportCases;
        } finally {
            await client.end();
        }
    }

    public async sendUnpublishedEvents() {
        let client = await this.connect();

        try {
            let query: string = "SELECT event_id, payload FROM wolfdesk.outbox WHERE is_published = false";
            const result = await client.query(query);

            const outboxEvents: { [eventId: number]: SupportCaseDomainEvent } = {};
            for await (const obj of result) {
                const eventId: number = Number(obj.event_id);
                const event: SupportCaseDomainEvent = JSON.parse(obj.payload);
                outboxEvents[eventId] = event;
            }

            console.log('Found unpublished events:', outboxEvents);

            await this.tryToPublishOutboxEvents(client, outboxEvents);
        } finally {
            await client.end();
        }
    }

    private async connect(): Promise<Client> {
        return await connect(this.dbConfig);
    }

    private async pushToOutbox(client: Client, supportCase: SupportCase): Promise< { [eventId: number]: SupportCaseDomainEvent } > {
        let result: { [eventId: number]: SupportCaseDomainEvent } = {};

        for (const event of supportCase.newDomainEvents) {
            const insertEventQuery = 'INSERT INTO wolfdesk.outbox(agg_id, payload) VALUES($1, $2) RETURNING event_id';
            const queryResult = await client.query(insertEventQuery, [supportCase.id, JSON.stringify(event)]);

            for await (const obj of queryResult) {
                const eventId: number = Number(obj.event_id);
                result[eventId] = event;
            }
        }

        return result;
    }

    private async tryToPublishOutboxEvents(client: Client, outboxEvents: { [eventId: number]: SupportCaseDomainEvent }): Promise<void> {
        for (const eventId in outboxEvents) {
            try {
                const event = outboxEvents[eventId];

                this.outboxDest.publish(event);

                let query: string = "UPDATE wolfdesk.outbox SET is_published = true, published_on = $2 WHERE event_id = $1 AND is_published = false";
                await client.query(query, [eventId, new Date()]);
            } catch (error) {
                console.log('Ignoring error:', error);
            }
        }
    }
}
