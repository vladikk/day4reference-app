import { SupportCasesRepository } from "../domain/support-cases/repository";
import { SupportCaseCommand } from "../domain/support-cases/commands";
import { CommandType } from "../domain/core/commands";
import { SupportCase } from "../domain/support-cases/support-case";
import { SupportCaseId } from "../domain/support-cases/support-case-id";
import { ExecutionResults, ExucutionResult, Success, Failure } from "./execution-results";

export class SupportCasesApplicationService {
    public readonly repository: SupportCasesRepository;

    constructor(repository: SupportCasesRepository) {
        this.repository = repository;
    }

    public async Execute(command: SupportCaseCommand) : Promise<ExucutionResult<SupportCaseId>> {
        try {
            let supportCase = await this.getSupportCase(command);
            supportCase.execute(command);
            await this.repository.save(supportCase, command.expectedVersion || supportCase.version);
            return {
                aggregateId: command.aggregateId,
                result: ExecutionResults.Success,
                newVersion: supportCase.version
            } as Success<SupportCaseId>;
        } catch (error: any) {
            return {
                aggregateId: command.aggregateId,
                result: ExecutionResults.Failure,
                error: error.message
            } as Failure<SupportCaseId>;
        }
    }

    public async sendUnpublishedEvents() : Promise<void> {
        await this.repository.sendUnpublishedEvents();
    }

    private async getSupportCase(command: SupportCaseCommand) : Promise<SupportCase> {
        if (command.type === CommandType.InitSupportCase) {
            return new SupportCase(command.aggregateId);
        } else {
            return await this.repository.load(command.aggregateId);
        }
    }
}