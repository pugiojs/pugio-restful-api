import {
    Controller,
    Get,
    Param,
    Query,
} from '@nestjs/common';
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
}
