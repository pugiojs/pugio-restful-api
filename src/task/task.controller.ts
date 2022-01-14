import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { TaskService } from './task.service';

@Controller('/task')
export class TaskController {
    public constructor(
        private readonly taskService: TaskService,
    ) {}

    @Post('')
    @UseGuards(AuthGuard())
    public async sendExecutionTask(
        @Body('hook_id') hookId: string,
        @CurrentUser() user: UserDTO,
    ) {
        return await this.taskService.sendExecutionTask(hookId, user);
    }

    @Get('')
    @UseGuards(AuthGuard('client-key'))
    public async consumeExecutionTask(@CurrentClient() client: ClientDTO) {
        return await this.taskService.consumeExecutionTask(client.id);
    }
}
