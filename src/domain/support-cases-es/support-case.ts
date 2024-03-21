import { SupportCaseId } from "../support-cases/support-case-id";
import { AgentId } from "../agents/agent-id";
import { CustomerId } from "../customers/customer-id";
import { Subject, MessageBody, Message } from '../support-cases//messaging';
import { DomainEventType } from "../core/domain-events";
import { CaseStatus } from "../support-cases//case-status";
import { MessageSent, SupportCaseDomainEvent } from "./domain-events";
import { CommandType } from "../core/commands";
import { AssignAgent, InitSupportCase, SupportCaseCommand, TrackAgentResponse, TrackCustomerResponse } from "../support-cases//commands";
import { AgentAssigned, AssignmentRequested, StatusChanged, SupportCaseCreated } from "../support-cases-es/domain-events";

export class SupportCase {
    public readonly id: SupportCaseId;
    private _version: number = 0;
    private _state: SupportCaseState;
    private _domainEvents: SupportCaseDomainEvent[] = [];
    private _newDomainEvents: SupportCaseDomainEvent[] = [];

    public get domainEvents(): SupportCaseDomainEvent[] {
        return this._domainEvents;
    }

    public get newDomainEvents(): SupportCaseDomainEvent[] {
        return this._newDomainEvents;
    }

    public get version(): number {
        return this._version;
    }

    public get state(): SupportCaseState {
        return this._state;
    }

    constructor(id: SupportCaseId, version: number = 0, domainEvents: SupportCaseDomainEvent[] = []) {
        this.id = id;
        this._version = version;
        this._state = new SupportCaseState(id);

        for (let e of domainEvents) {
            this._state.apply(e);
        }
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
        this.apply({
            aggregateId: this.id,
            type: DomainEventType.SupportCaseCreated,
            timestamp: timestamp,
            customer: customer,
            subject: subject,
            message: messageBody,
            metadata: {}
        } as SupportCaseCreated);

        this.changeStatus(CaseStatus.New, timestamp);

        this.apply({
            aggregateId: this.id,
            type: DomainEventType.AssignmentRequested,
            timestamp: timestamp,
            customer: customer,
            caseStatus: CaseStatus.New,
            metadata: {}
        } as AssignmentRequested);
    }

    private assignAgent(agent: AgentId, timestamp: Date) {
        let prevStatus = this._state.status;

        this.apply({
            aggregateId: this.id,
            type: DomainEventType.AgentAssigned,
            timestamp: timestamp,
            agent: agent,
            metadata: {}
        } as AgentAssigned)

        this.changeStatus(CaseStatus.Open, timestamp);

        if (prevStatus === CaseStatus.New) {
            this.addMessage(this._state.customer, this._state.firstMessage, timestamp);
        }
    }

    private trackAgentResponse(message: MessageBody, newStatus: CaseStatus, timestamp: Date) {
        this.addMessage(this._state.customer, message, timestamp);
        this.changeStatus(newStatus, timestamp);
    }

    private trackCustomerResponse(message: MessageBody, timestamp: Date) {
        this.addMessage(this._state.assignedAgent!, message, timestamp);

        if (this._state.status != CaseStatus.Open) {
            this.changeStatus(CaseStatus.Open, timestamp);
        }
    }

    public committed() {
        this._newDomainEvents = [];
        this._version++;
    }

    private addMessage(author: AgentId | CustomerId, body: MessageBody, timestamp: Date) {
        let msg: Message = {
            id: this._state.messages.length + 1,
            author: author,
            body: body,
            timestamp: timestamp
        };

        this.apply({
            aggregateId: this.id,
            type: DomainEventType.MessageSent,
            timestamp: timestamp,
            message: msg,
            metadata: {}
        } as MessageSent);
    }

    private changeStatus(newStatus: CaseStatus, timestamp: Date) {
        this.apply({
            aggregateId: this.id,
            type: DomainEventType.StatusChanged,
            timestamp: timestamp,
            caseStatus: newStatus,
            metadata: {}
        } as StatusChanged);
    }

    private apply(e: SupportCaseDomainEvent) {
        this._domainEvents.push(e);
        this._newDomainEvents.push(e);
        this._state.apply(e);
    }
}

class SupportCaseState {
    public readonly id: SupportCaseId;
    private _status: CaseStatus = CaseStatus.New;
    private _assignedAgent: AgentId | null = null;
    private _createdOn: Date | null = null;
    private _customer: CustomerId | null = null;
    private _subject: Subject | null = null;
    private _firstMessage: MessageBody | null = null;
    private _messages: Message[] = [];

    constructor(id: SupportCaseId) {
        this.id = id;
    }

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

    public apply(e: SupportCaseDomainEvent) {
        if (e.aggregateId !== this.id) {
            throw new Error("Invalid event");
        }

        if (e.type === DomainEventType.SupportCaseCreated) {
            this.supportCaseCreated(e as SupportCaseCreated);
        } else if (e.type === DomainEventType.AssignmentRequested) {
            this.assignmentRequested(e as AssignmentRequested);
        } else if (e.type === DomainEventType.MessageSent) {
            this.messageSent(e as MessageSent);
        } else if (e.type === DomainEventType.StatusChanged) {
            this.statusChanged(e as StatusChanged);
        } else if (e.type === DomainEventType.AgentAssigned) {
            this.agentAssigned(e as AgentAssigned);
        }
    }

    private supportCaseCreated(e: SupportCaseCreated) {
        this._createdOn = e.timestamp;
        this._customer = e.customer;
        this._subject = e.subject;
        this._firstMessage = e.message;
    }

    private assignmentRequested(_: AssignmentRequested) { }

    private messageSent(e: MessageSent) {
        this._messages.push(e.message);
    }

    private statusChanged(e: StatusChanged) {
        this._status = e.caseStatus;
    }

    private agentAssigned(e: AgentAssigned) {
        this._assignedAgent = e.agent;
    }
}