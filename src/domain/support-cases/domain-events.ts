import { DomainEvent, DomainEventType } from '../core/domain-events';
import { CustomerId } from '../customers/customer-id';
import { CaseStatus } from './case-status';
import { Message } from './messaging';
import { SupportCaseId } from './support-case-id';

export type SupportCaseDomainEvent = DomainEvent<SupportCaseId>;

export type AssignmentRequested = SupportCaseDomainEvent & {
    type: DomainEventType.AssignmentRequested,
    caseStatus: CaseStatus
    customer: CustomerId
}

export type MessageSent = SupportCaseDomainEvent & {
    type: DomainEventType.MessageSent,
    message: Message
}