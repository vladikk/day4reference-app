import { SupportCase } from "./support-case";
import { SupportCaseId } from "./support-case-id";

export interface SupportCasesRepository {
    save(supportCase: SupportCase): Promise<void>;
    load(id: SupportCaseId): Promise<SupportCase>;
    loadAll(): Promise<SupportCase[]>;
    sendUnpublishedEvents(): Promise<void>;
}