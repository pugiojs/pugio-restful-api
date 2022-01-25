import {
    Body,
    Controller,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransformDTOPipe } from 'src/app.pipe';
import { ClientInterceptor } from 'src/client/client.interceptor';
import { HookDTO } from './dto/hook.dto';
import { HookInterceptor } from './hook.interceptor';
import { HookService } from './hook.service';

@Controller('/hook')
export class HookController {
    public constructor(
        private readonly hookService: HookService,
    ) {}

    @Post('')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: ['body'],
        paths: '$.client',
        type: [0, 1],
    }))
    public async createHook(
        @Body('client') clientId: string,
        @Body('data', TransformDTOPipe) data: Partial<HookDTO>,
    ) {
        return await this.hookService.createHook(clientId, data);
    }

    @Post('/:hook_id')
    @UseGuards(AuthGuard('api-key'))
    @UseInterceptors(HookInterceptor({
        sources: ['params'],
        paths: '$.hook_id',
        type: -1,
    }))
    public async sendExecutionTask(
        @Param('hook_id') hookId: string,
        @Body() content,
    ) {
        return await this.hookService.sendExecutionTask(hookId, content);
    }
}
