import { connect, Client, Configuration } from 'ts-postgres';
import { SupportCasesEventSourcedRepository } from "../../domain/support-cases-es/repository";
import { SupportCase } from "../../domain/support-cases-es/support-case";
import { SupportCaseId } from "../../domain/support-cases/support-case-id";
import { OptimisticConcurrencyError } from "../../domain/core/optimistic-concurrency-error";
import { SupportCaseDomainEvent } from '../../domain/support-cases-es/domain-events';

export class PostgresSupportCasesRepositoryES implements SupportCasesEventSourcedRepository {
    private dbConfig: Configuration;

    constructor(host: string,
        port: number,
        user: string,
        password: string,
        database: string) {
        this.dbConfig = {
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        }
    }

    async Save(supportCase: SupportCase, expectedVersion: number): Promise<void> {
        let id = supportCase.id;
        let changeSetId = expectedVersion + 1;
        let payload = supportCase.newDomainEvents;
        

        let client = await this.connect();

        try {
            let query = 'INSERT INTO wolfdesk.support_cases_es(agg_id, changeset_id, payload, metadata) VALUES($1, $2, $3, $4)';
            await client.query(query, [id, changeSetId, payload, null]);
            supportCase.committed();
        } catch (error) {
            if (error instanceof Error && 'code' in error && (error as any).code === '23505') {
                throw new OptimisticConcurrencyError(id, changeSetId - 1);
            } else {
              console.error('An error occurred:', error);
              throw error;
            }
        } finally {
            await client.end();
        }
    }

    async Load(id: SupportCaseId): Promise<SupportCase> {
        let client = await this.connect();

        try {
            let query: string = "SELECT agg_id, changeset_id, payload FROM wolfdesk.support_cases_es WHERE agg_id = $1 ORDER BY changeset_id asc";
            const result = await client.query(query, [id]);

            let domainEvents: SupportCaseDomainEvent[] = [];

            let version = 0;
            for await (const obj of result) {
                domainEvents = domainEvents.concat(obj.payload);
                version++;
            }

            if (version == 0) {
                throw new Error(`Support case with id ${id} not found`);
            }

            return new SupportCase(id, version, domainEvents)
        } finally {
            await client.end();
        }
    }

    private async connect(): Promise<Client> {
        return await connect(this.dbConfig);
    }
}