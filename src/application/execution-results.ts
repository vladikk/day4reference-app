export enum ExecutionResults {
    Success = "SUCCESS",
    Failure = "FAILURE"
}

export type ExucutionResult<TAggregateID> = {
    aggregateId: TAggregateID;
}

export type Success<TAggregateID> = ExucutionResult<TAggregateID> & {
    result: ExecutionResults.Success;
    newVersion: number;
}

export type Failure<TAggregateID> = ExucutionResult<TAggregateID> & {
    result: ExecutionResults.Failure;
    error: string;
}