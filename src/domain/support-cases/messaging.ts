import { AgentId } from "../agents/agent-id";
import { CustomerId } from "../customers/customer-id";

export type Subject = string;
export type MessageBody = string;

export type Message = {
    id: number,
    author: AgentId | CustomerId,
    body: MessageBody,
    timestamp: Date
}