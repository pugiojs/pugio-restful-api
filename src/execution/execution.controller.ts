import {
    Controller,
    Get,
    Param,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskInterceptor } from 'src/task/task.interceptor';
import { ExecutionService } from './execution.service';

@Controller('/execution')
export class ExecutionController {
    public constructor(
        private readonly executionService: ExecutionService,
    ) {}

    @Get('/:task_id')
    @UseGuards(AuthGuard())
    @UseInterceptors(TaskInterceptor({
        sources: 'params',
    }))
    public async getExecutionRecords(@Param('task_id') taskId: string) {
        return await this.executionService.getExecutionRecords(taskId);
    }
}
