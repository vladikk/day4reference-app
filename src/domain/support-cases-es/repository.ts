import { SupportCase } from "./support-case";
import { SupportCaseId } from "../support-cases//support-case-id";

export interface SupportCasesEventSourcedRepository {
    Save(supportCase: SupportCase, expectedVersion: number): Promise<void>;
    Load(id: SupportCaseId): Promise<SupportCase>;
}