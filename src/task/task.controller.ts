import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermanentlyParseIntPipe } from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientDTO } from 'src/client/dto/client.dto';
import { TaskInterceptor } from './task.interceptor';
import { TaskService } from './task.service';

@Controller('/task')
export class TaskController {
    public constructor(
        private readonly taskService: TaskService,
    ) {}

    @Get('')
    @UseGuards(AuthGuard('client-key'))
    public async consumeExecutionTask(@CurrentClient() client: ClientDTO) {
        return await this.taskService.consumeExecutionTask(client);
    }

    @Post('/:task_id/execution')
    @UseGuards(AuthGuard('client-key'))
    @UseInterceptors(TaskInterceptor({}))
    public async pushTaskExecution(
        @Param('task_id') taskId: string,
        @Body('sequence', PermanentlyParseIntPipe) sequence: number,
        @Body('status') status?: number,
        @Body('content') content?: string,
    ) {
        return await this.taskService.pushTaskExecution(
            taskId,
            sequence,
            status,
            content,
        );
    }
}
