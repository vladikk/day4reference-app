import { v4 as uuidv4 } from 'uuid';

export type SupportCaseId = string;

export function newSupportCaseId(): SupportCaseId {
  return uuidv4();
}