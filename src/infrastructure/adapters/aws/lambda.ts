import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SupportCasesApplicationService } from '../../../application/support-cases';
import { SupportCaseCommand } from '../../../domain/support-cases/commands';
import { PostgresSupportCasesRepository } from '../../../infrastructure/support-cases/postgres-repository';
import { SnsEventPublsher } from './snsEventPublisher';
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secretsManagerClient = new SecretsManagerClient();

export async function supportCaseApiHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const command: SupportCaseCommand = JSON.parse(event.body || '');

        const repository = await initRepository();
        const applicationService = new SupportCasesApplicationService(repository);
        const result = await applicationService.Execute(command);

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error executing command:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
}

export async function publishOutboxEventsHandler() {
    console.log("Checking for unpublished events");
    const repository = await initRepository();
    const applicationService = new SupportCasesApplicationService(repository);
    await applicationService.sendUnpublishedEvents();
    console.log("Done");
}

export async function processIncomingMessages(event: any) {
    try {
        for (const record of event.Records) {
            const message = JSON.parse(record.body);
            console.log('Calling an application service to process message:', message);
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
}

async function initRepository(): Promise<PostgresSupportCasesRepository> {
    const host = process.env.RDS_PROXY_ENDPOINT!;
    const port = process.env.DB_PORT!;
    const user = process.env.DB_USER!;
    const database = process.env.DB_NAME!;
    const snsArn = process.env.OUTGOING_MESSAGES_TOPIC_ARN!;
    const secretArn = process.env.DB_SECRET_ARN!;
    const password = await getSecret(secretArn);
    const eventPublisher = new SnsEventPublsher(snsArn);

    return new PostgresSupportCasesRepository(host, parseInt(port), user, password, database, eventPublisher);
}

async function getSecret(secretArn: string): Promise<string> {
    try {
        const command = new GetSecretValueCommand({
            SecretId: secretArn,
        });

        const response = await secretsManagerClient.send(command);
        const secretString = response.SecretString;

        if (secretString) {
            const secret = JSON.parse(secretString);
            return secret.password;
        } else {
            throw new Error('Secret value not found');
        }
    } catch (error) {
        console.error('Error retrieving database password:', error);
        throw error;
    }
}

export async function testHandler() {
    console.log("Hello world!");
}