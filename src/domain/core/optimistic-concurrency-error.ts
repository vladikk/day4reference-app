export class OptimisticConcurrencyError extends Error {
    public aggregateId: string;
    public expectedVersion: number;
  
    constructor(aggregateId: string, expectedVersion: number) {
      super(`Optimistic concurrency check failed for aggregate ID ${aggregateId} with expected version ${expectedVersion}.`);
      this.name = 'OptimisticConcurrencyError';
      this.aggregateId = aggregateId;
      this.expectedVersion = expectedVersion;
  
      // Maintaining proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, OptimisticConcurrencyError);
      }
  
      // Set the prototype explicitly.
      Object.setPrototypeOf(this, OptimisticConcurrencyError.prototype);
    }
  }
  