import {
    Controller,
    Get,
    Param,
    Post,
    Query,
    // UseGuards,
} from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
import { ClientService } from './client.service';

@Controller('/client')
export class ClientController {
    public constructor(
        private readonly clientService: ClientService,
    ) {}

    @Get('/test/:id')
    public async sendExecutionResult(
        @Param('id') executionId: string,
        @Query('command') command: string,
    ) {
        return await this.clientService.sendExecutionResult(parseInt(executionId, 10), command);
    }

    @Post('/:client_id/task')
    // TODO
    // @UseGuards(AuthGuard())
    public async sendExecutionTask(@Param('client_id') clientId: string) {
        
    }
}
