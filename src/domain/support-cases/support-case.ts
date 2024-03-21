import { SupportCaseId } from "./support-case-id";
import { AgentId } from "../agents/agent-id";
import { CustomerId } from "../customers/customer-id";
import { Subject, MessageBody, Message } from './messaging';
import { DomainEventType } from "../core/domain-events";
import { CaseStatus } from "./case-status";
import { MessageSent, SupportCaseDomainEvent } from "./domain-events";
import { CommandType } from "../core/commands";
import { AssignAgent, InitSupportCase, SupportCaseCommand, TrackAgentResponse, TrackCustomerResponse } from "./commands";

export class SupportCase {
    public readonly id: SupportCaseId;
    private _version: number = 0;
    private _status: CaseStatus = CaseStatus.New;
    private _assignedAgent: AgentId | null = null;
    private _createdOn: Date | null = null;
    private _customer: CustomerId | null = null;
    private _subject: Subject | null = null;
    private _firstMessage: MessageBody | null = null;

    private _messages: Message[] = [];

    private _newDomainEvents: SupportCaseDomainEvent[] = [];

    public get status(): CaseStatus {
        return this._status;
    }

    public get assignedAgent(): AgentId | null {
        return this._assignedAgent;
    }

    public get createdOn(): Date {
        return this._createdOn!;
    }

    public get customer(): CustomerId {
        return this._customer!;
    }

    public get subject(): Subject {
        return this._subject!;
    }

    public get firstMessage(): MessageBody {
        return this._firstMessage!;
    }

    public get messages(): Message[] {
        return this._messages;
    }

    public get newDomainEvents(): SupportCaseDomainEvent[] {
        return this._newDomainEvents;
    }

    public get version(): number {
        return this._version;
    }

    constructor(id: SupportCaseId, version: number = 0) {
        this.id = id;
        this._version = version;
    }

    public execute(cmd: SupportCaseCommand) {
        if (cmd.aggregateId !== this.id) {
            throw new Error("Invalid command");
        }

        if (cmd.type === CommandType.InitSupportCase) {
            let c = cmd as InitSupportCase;
            this.initSupportCase(c.customer, c.subject, c.messageBody, c.timestamp);
        } else if (cmd.type === CommandType.AssignAgent) {
            let c = cmd as AssignAgent;
            this.assignAgent(c.agent, c.timestamp);
        } else if (cmd.type === CommandType.TrackAgentResponse) {
            let c = cmd as TrackAgentResponse;
            this.trackAgentResponse(c.message, c.newStatus, c.timestamp);
        } else if (cmd.type === CommandType.TrackCustomerResponse) {
            let c = cmd as TrackCustomerResponse;
            this.trackCustomerResponse(c.message, c.timestamp);
        }
    }

    private initSupportCase(customer: CustomerId, subject: Subject, messageBody: MessageBody, timestamp: Date) {
        this._customer = customer;
        this._subject = subject;
        this._firstMessage = messageBody;
        this._createdOn = timestamp;

        this.addDomainEvent({
            aggregateId: this.id,
            type: DomainEventType.AssignmentRequested,
            timestamp: timestamp,
            metadata: {
                subject: subject,
                customer: customer
            }
        });
    }

    private assignAgent(agent: AgentId, timestamp: Date) {
        this._assignedAgent = agent;
        let prevStatus = this._status;
        this._status = CaseStatus.Open;

        if (prevStatus === CaseStatus.New) {
            this.addMessage(this.customer, this.firstMessage, timestamp);
        }
    }

    private trackAgentResponse(message: MessageBody, newStatus: CaseStatus, timestamp: Date) {
        this.addMessage(this.customer, message, timestamp);
        this._status = newStatus;
    }

    private trackCustomerResponse(message: MessageBody, timestamp: Date) {
        this.addMessage(this.assignedAgent!, message, timestamp);

        if (this.status != CaseStatus.Open) {
            this._status = CaseStatus.Open;
        }
    }

    public committed() {
        this._version++;
        this._newDomainEvents = [];
    }

    private addDomainEvent(e: SupportCaseDomainEvent) {
        this._newDomainEvents.push(e);
    }

    private addMessage(author: AgentId | CustomerId, body: MessageBody, timestamp: Date) {
        let msg: Message = {
            id: this._messages.length + 1,
            author: author,
            body: body,
            timestamp: timestamp
        };

        this._messages.push(msg);

        let domainEvent: MessageSent = {
            aggregateId: this.id,
            type: DomainEventType.MessageSent,
            timestamp: timestamp,
            message: msg,
            metadata: {}
        }

        this.addDomainEvent(domainEvent);
    }

    public toJSON(): string {
        return JSON.stringify({
            id: this.id,
            _status: this._status,
            _assignedAgent: this._assignedAgent,
            _createdOn: this._createdOn,
            _customer: this._customer,
            _subject: this._subject,
            _firstMessage: this._firstMessage,
            _messages: this._messages
        });
    }

    public static fromJSON(json: string, version: number): SupportCase {
        let obj = JSON.parse(json);
        let supportCase = new SupportCase(obj.id, version);
        supportCase._status = obj._status;
        supportCase._createdOn = new Date(obj._createdOn);
        supportCase._assignedAgent = obj._assignedAgent;
        supportCase._customer = obj._customer;
        supportCase._subject = obj._subject;
        supportCase._firstMessage = obj._firstMessage;
        supportCase._messages = obj._messages?.map((m: any) => {
            return {
                id: m.id,
                author: m.author,
                body: m.body,
                timestamp: new Date(m.timestamp)
            }
        }) ?? [];
        return supportCase;
    }
}
