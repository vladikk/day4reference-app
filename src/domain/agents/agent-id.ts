import { v4 as uuidv4 } from 'uuid';
import { UserType } from '../core/user-type';

export type AgentId = {
    type: UserType.Agent;
    value: string;
};

export function newAgentId(): AgentId {
    return { type: UserType.Agent, value: uuidv4() }
}