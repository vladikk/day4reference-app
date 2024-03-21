import { DomainEvent } from "./domain-events";

export interface EventPublisher {
    publish<TAggregateId>(event: DomainEvent<TAggregateId>): Promise<void>;
}