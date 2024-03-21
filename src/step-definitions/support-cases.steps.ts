import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

import { SupportCase } from '../domain/support-cases/support-case';
import { newSupportCaseId } from '../domain/support-cases/support-case-id';
import { SupportCaseDomainEvent } from '../domain/support-cases/domain-events';
import { CaseStatus } from '../domain/support-cases/case-status';
import { AssignAgent, InitSupportCase, TrackAgentResponse, TrackCustomerResponse } from '../domain/support-cases/commands';

import { newCustomerId } from '../domain/customers/customer-id';
import { ICustomWorld } from './world';
import { newAgentId } from '../domain/agents/agent-id';
import { DomainEventType } from '../domain/core/domain-events';

import { CommandType } from '../domain/core/commands';

Given('a valid new support case', function (this: ICustomWorld) {
    let supportCase = createSupportCase(this.now);
    supportCase.committed();
    this.supportCase = supportCase;
});

Given('an assigned support case', function (this: ICustomWorld) {
    let supportCase = createSupportCase(this.now);

    let cmd: AssignAgent = {
        aggregateId: supportCase.id,
        type: CommandType.AssignAgent,
        agent: newAgentId(),
        timestamp: this.now,
        metadata: {}
    };

    supportCase.execute(cmd);
    supportCase.committed();

    this.supportCase = supportCase;
});

Given('the agent replies and changes the status to {word}', function (statusName: string) {
    let status = parseCaseStatus(statusName);
    let supportCase = this.supportCase!;

    let cmd: TrackAgentResponse = {
        aggregateId: supportCase.id,
        type: CommandType.TrackAgentResponse,
        message: "I'm on it!",
        newStatus: status,
        timestamp: this.now,
        metadata: {}
    };

    supportCase.execute(cmd);
    supportCase.committed();
});

When('a valid new support case is initialized', function (this: ICustomWorld) {
    let supportCase = createSupportCase(this.now);
    this.supportCase = supportCase;
});

When('an agent is assigned', function (this: ICustomWorld) {
    let cmd: AssignAgent = {
        aggregateId: this.supportCase!.id,
        type: CommandType.AssignAgent,
        agent: newAgentId(),
        timestamp: this.now,
        metadata: {}
    };

    this.supportCase?.execute(cmd);
});

When('agent replies and changes the status to {word}', function (statusName: string) {
    let status = parseCaseStatus(statusName);
    let supportCase = this.supportCase!;

    let cmd: TrackAgentResponse = {
        aggregateId: supportCase.id,
        type: CommandType.TrackAgentResponse,
        message: "I'm on it!",
        newStatus: status,
        timestamp: this.now,
        metadata: {}
    };


    supportCase.execute(cmd);
});

When('customer replies', async function () {
    let supportCase = this.supportCase!;

    let cmd: TrackCustomerResponse = {
        aggregateId: supportCase.id,
        type: CommandType.TrackCustomerResponse,
        message: "I'm still on fire!",
        timestamp: this.now,
        metadata: {}
    };

    supportCase.execute(cmd);
});

Then('agent assignment is requested', function () {
    assertDomainEventExists(this.supportCase, DomainEventType.AssignmentRequested);
});

Then('status changes to {word}', function (statusName: string) {
    assertStatus(this.supportCase, statusName);
})

Then('message is sent to the customer', async function () {
    assertDomainEventExists(this.supportCase, DomainEventType.MessageSent);
});

Then('message is sent to the assigned agent', async function () {
    assertDomainEventExists(this.supportCase, DomainEventType.MessageSent);
});

Then('message is sent to the agent', async function () {
    assertDomainEventExists(this.supportCase, DomainEventType.MessageSent);
});

function assertDomainEventExists(supportCase: SupportCase, type: DomainEventType) {
    const domainEvent = supportCase.newDomainEvents.find((e: SupportCaseDomainEvent) =>
        e.type === type
    );

    assert(domainEvent !== undefined, `Domain event of type ${type} not found`);
}

function assertStatus(supportCase: SupportCase, strStatus: string) {
    const expectedStatus = parseCaseStatus(strStatus);
    assert(supportCase.status.toString() === expectedStatus, `Status is not ${strStatus}`);
}

function createSupportCase(timestamp: Date): SupportCase {
    let cmd: InitSupportCase = {
        aggregateId: newSupportCaseId(),
        type: CommandType.InitSupportCase,
        customer: newCustomerId(),
        subject: "My printer is on fire!",
        messageBody: "Help!",
        timestamp: timestamp,
        metadata: {}
    }

    let supportCase = new SupportCase(cmd.aggregateId);
    supportCase.execute(cmd);
    return supportCase;
}

function parseCaseStatus(str: string): CaseStatus {
    return CaseStatus[str as keyof typeof CaseStatus];
}