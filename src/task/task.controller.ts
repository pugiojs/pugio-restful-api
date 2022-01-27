import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
} from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientInterceptor } from 'src/client/client.interceptor';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { TaskInterceptor } from './task.interceptor';
import { TaskService } from './task.service';

@Controller('/task')
export class TaskController {
    public constructor(
        private readonly taskService: TaskService,
    ) {}

    @Get('/consume')
    @UseGuards(AuthGuard('client-key'))
    public async consumeExecutionTask(
        @CurrentUser() user: UserDTO,
        @CurrentClient() client: ClientDTO,
    ) {
        return await this.taskService.consumeExecutionTask(user, client);
    }

    @Get('/:task_id')
    @UseGuards(AuthGuard())
    @UseInterceptors(TaskInterceptor({}))
    public async getTask(@Param('task_id') taskId: string) {
        return await this.taskService.getTask(taskId);
    }

    @Get('')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'query',
    }))
    public async queryTasks(
        @Query('client_id') clientId: string,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.taskService.queryTasks(
            clientId,
            {
                size,
                lastCursor,
                searchContent,
                range: {
                    createdAt: createDateRange,
                },
            },
        );
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
