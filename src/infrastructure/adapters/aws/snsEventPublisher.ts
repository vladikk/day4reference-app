import { EventPublisher } from "../../../domain/core/event-publisher.js";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DomainEvent } from "../../../domain/core/domain-events.js";

export class SnsEventPublsher implements EventPublisher {
    private readonly sns: SNSClient;
    private readonly topicArn: string;

    constructor(topicArn: string) {
        this.sns = new SNSClient({});
        this.topicArn = topicArn;
    }

    async publish<TAggregateId>(event: DomainEvent<TAggregateId>): Promise<void> {
        const response = await this.sns.send(
            new PublishCommand({
              Message: JSON.stringify(event),
              TopicArn: this.topicArn,
            }),
        );

        console.log(response);
    }
}