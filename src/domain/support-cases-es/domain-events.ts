import { AgentId } from '../agents/agent-id';
import { DomainEvent, DomainEventType } from '../core/domain-events';
import { CustomerId } from '../customers/customer-id';
import { CaseStatus } from '../support-cases/case-status';
import { Message, MessageBody, Subject } from '../support-cases/messaging';
import { SupportCaseId } from '../support-cases/support-case-id';

export type SupportCaseDomainEvent = DomainEvent<SupportCaseId>;

export type SupportCaseCreated = SupportCaseDomainEvent & {
    type: DomainEventType.SupportCaseCreated,
    customer: CustomerId,
    subject: Subject,
    message: MessageBody
}

export type StatusChanged = SupportCaseDomainEvent & {
    type: DomainEventType.StatusChanged,
    caseStatus: CaseStatus
}

export type AssignmentRequested = SupportCaseDomainEvent & {
    type: DomainEventType.AssignmentRequested,
    caseStatus: CaseStatus
    customer: CustomerId
}

export type MessageSent = SupportCaseDomainEvent & {
    type: DomainEventType.MessageSent,
    message: Message
}

export type AgentAssigned = SupportCaseDomainEvent & {
    type: DomainEventType.AgentAssigned,
    agent: AgentId
}