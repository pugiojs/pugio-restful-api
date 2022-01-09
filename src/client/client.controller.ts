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
    public sendExecutionResult(
        @Param('id') executionId: string,
        @Query('message') content: string,
    ) {
        console.log(executionId, content);
        return this.clientService.sendExecutionResult(parseInt(executionId, 10), content);
    }
}
