import {
    Body,
    Controller,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { HookService } from './hook.service';

@Controller('/hook')
export class HookController {
    public constructor(
        private readonly hookService: HookService,
    ) {}

    @Post('/:hook_id/task')
    @UseGuards(AuthGuard())
    public async sendExecutionTask(
        @Param('hook_id') hookId: string,
        @CurrentUser() user: UserDTO,
        @Body() content,
    ) {
        return await this.hookService.sendExecutionTask(hookId, user, content);
    }
}
