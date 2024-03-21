import { PostgresSupportCasesRepository } from "./infrastructure/support-cases/postgres-repository";
import { PostgresSupportCasesRepositoryES } from "./infrastructure/support-cases-es/postgres-repository";

import { newAgentId } from "./domain/agents/agent-id";
import { CommandType } from "./domain/core/commands";
import { newCustomerId } from "./domain/customers/customer-id";
import { AssignAgent, InitSupportCase } from "./domain/support-cases/commands";
import { newSupportCaseId } from "./domain/support-cases/support-case-id";
import * as dotenv from 'dotenv';
import { SupportCasesApplicationService as App } from "./application/support-cases";
import { SupportCasesApplicationService as EsApp } from "./application/support-cases-es";
import { SupportCasesRepository } from "./domain/support-cases/repository";
import { SupportCasesEventSourcedRepository } from "./domain/support-cases-es/repository";
import { SupportCaseId } from "./domain/support-cases/support-case-id";
import { ExucutionResult } from "./application/execution-results";
import { SnsEventPublsher } from "./infrastructure/adapters/aws/snsEventPublisher";
import { AgentAssigned } from "./domain/support-cases-es/domain-events";
import { DomainEventType } from "./domain/core/domain-events";
import { connect, Client, Configuration, SSLMode, SSL } from 'ts-postgres';
import { Pool } from 'pg';

dotenv.config();



let topic = process.env.OUTBOX_SNS_ARN!;
let sns = new SnsEventPublsher(topic);

function initRepository() : SupportCasesRepository {
    let host = process.env.DB_HOST!;
    let port = process.env.DB_PORT!;
    let user = process.env.DB_USER!;
    let password = process.env.DB_PASSWORD!;
    let database = process.env.DB_NAME!;
    return new PostgresSupportCasesRepository(host, parseInt(port), user, password, database, sns);
}

function initEsRepository() : SupportCasesEventSourcedRepository {
    let host = process.env.DB_HOST!;
    let port = process.env.DB_PORT!;
    let user = process.env.DB_USER!;
    let password = process.env.DB_PASSWORD!;
    let database = process.env.DB_NAME!;
    return new PostgresSupportCasesRepositoryES(host, parseInt(port), user, password, database);
}

function initApp() {
    let repo = initRepository();
    return new App(repo);
}

function initEsApp() {
    let repo = initEsRepository();
    return new EsApp(repo);
}

let cmdInit: InitSupportCase = {
    aggregateId: newSupportCaseId(),
    type: CommandType.InitSupportCase,
    customer: newCustomerId(),
    subject: "My printer is on fire!",
    messageBody: "Help!",
    timestamp: new Date(),
    metadata: {},
    expectedVersion: null
}

let cmdAssign: AssignAgent = {
    aggregateId: cmdInit.aggregateId,
    type: CommandType.AssignAgent,
    agent: newAgentId(),
    timestamp: new Date(),
    metadata: {},
    expectedVersion: null
}


// let app = initApp();
// app.Execute(cmdInit).then((result: ExucutionResult<SupportCaseId>) => {
//     console.log(result)
//     app.Execute(cmdAssign).then((result: ExucutionResult<SupportCaseId>) => {
//         console.log(result)
//     });
// });

// let esApp = initEsApp();
// esApp.Execute(cmdInit).then((result: ExucutionResult<SupportCaseId>) => {
//     console.log(result)
//     esApp.Execute(cmdAssign).then((result: ExucutionResult<SupportCaseId>) => {
//         console.log(result)
//     });
// });


// let event: AgentAssigned = {
//     aggregateId: newSupportCaseId(),
//     type: DomainEventType.AgentAssigned,
//     agent: newAgentId(),
//     timestamp: new Date(),
//     metadata: {}
// } as AgentAssigned;

//sns.publish(event).then(() => { console.log("Published")});


console.log(JSON.stringify(cmdInit))