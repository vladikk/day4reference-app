import { SupportCase } from "../domain/support-cases-es/support-case";
import { SupportCasesEventSourcedRepository } from "../domain/support-cases-es/repository";
import { SupportCaseCommand } from "../domain/support-cases/commands";
import { CommandType } from "../domain/core/commands";
import { SupportCaseId } from "../domain/support-cases/support-case-id";
import { ExecutionResults, ExucutionResult, Success, Failure } from "./execution-results";

export class SupportCasesApplicationService {
    public readonly repository: SupportCasesEventSourcedRepository;

    constructor(repository: SupportCasesEventSourcedRepository) {
        this.repository = repository;
    }

    public async Execute(command: SupportCaseCommand) : Promise<ExucutionResult<SupportCaseId>> {
        try {
            let supportCase = await this.getSupportCase(command);
            supportCase.execute(command);
            await this.repository.Save(supportCase);

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

    private async getSupportCase(command: SupportCaseCommand) : Promise<SupportCase> {
        if (command.type === CommandType.InitSupportCase) {
            return new SupportCase(command.aggregateId);
        } else {
            return await this.repository.Load(command.aggregateId);
        }
    }
}