export type Command<TAggregateId> = {
    aggregateId: TAggregateId,
    type: CommandType,
    timestamp: Date,
    metadata: { [key: string]: any };
}

export enum CommandType {
    InitSupportCase = "InitSupportCase",
    AssignAgent = "AssignAgent",
    TrackAgentResponse = "TrackAgentResponse",
    TrackCustomerResponse = "TrackCustomerResponse"
}
