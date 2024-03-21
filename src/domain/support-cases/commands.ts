import { AgentId } from "../agents/agent-id";
import { Command, CommandType } from "../core/commands";
import { CustomerId } from "../customers/customer-id";
import { CaseStatus } from "./case-status";
import { MessageBody, Subject } from "./messaging";
import { SupportCaseId } from "./support-case-id";

export type SupportCaseCommand = Command<SupportCaseId>;

export type InitSupportCase = SupportCaseCommand & {
    type: CommandType.InitSupportCase,
    customer: CustomerId,
    subject: Subject,
    messageBody: MessageBody
}

export type AssignAgent = SupportCaseCommand & {
    type: CommandType.AssignAgent,
    agent: AgentId,
    timestamp: Date
}

export type TrackAgentResponse = SupportCaseCommand & {
    type: CommandType.TrackAgentResponse,
    message: MessageBody
    newStatus: CaseStatus,
    timestamp: Date
}

export type TrackCustomerResponse = SupportCaseCommand & {
    type: CommandType.TrackCustomerResponse,
    message: MessageBody
    timestamp: Date
}