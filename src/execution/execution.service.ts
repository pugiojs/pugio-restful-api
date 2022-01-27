import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionDTO } from './dto/execution.dto';

@Injectable()
export class ExecutionService {
    public constructor(
        @InjectRepository(ExecutionDTO)
        private readonly executionRepository: Repository<ExecutionDTO>,
    ) {}

    public async getExecutionRecords(taskId: string) {
        const executionRecords = await this.executionRepository.find({
            where: {
                task: {
                    id: taskId,
                },
            },
            order: {
                sequence: 'ASC',
            },
        });

        return executionRecords;
    }
}
