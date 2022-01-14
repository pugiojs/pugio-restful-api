import {
    Body,
    Controller,
    Delete,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentClient } from './client.decorator';
import { ClientService } from './client.service';
import { ClientDTO } from './dto/client.dto';

@Controller('/client')
export class ClientController {
    public constructor(
        private readonly clientService: ClientService,
    ) {}

    @Post('/locker')
    @UseGuards(AuthGuard('client-key'))
    public async lockExecutionTaskChannel(@CurrentClient() client: ClientDTO) {
        return await this.clientService.lockExecutionTaskChannel(client.id);
    }

    @Delete('/locker')
    @UseGuards(AuthGuard('client-key'))
    public async unlockExecutionTaskChannel(
        @CurrentClient() client: ClientDTO,
        @Body('validation') validationValue: string,
    ) {
        return await this.clientService.unlockExecutionTaskChannel(client.id, validationValue);
    }
}
