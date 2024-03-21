export type DomainEvent<TAggregateId> = {
    aggregateId: TAggregateId,
    type: DomainEventType,
    timestamp: Date,
    metadata: { [key: string]: any };
}

export enum DomainEventType {
    SupportCaseCreated = "SupportCaseCreated",
    AssignmentRequested = "AssignmentRequested",
    MessageSent = "MessageSent",
    StatusChanged = "StatusChanged",
    AgentAssigned = "AgentAssigned"
}