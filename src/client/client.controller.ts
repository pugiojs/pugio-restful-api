import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermanentlyParseIntPipe } from 'src/app.pipe';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { CurrentClient } from './client.decorator';
import { ClientService } from './client.service';
import { ClientDAO } from './dao/client.dao';
import { ClientDTO } from './dto/client.dto';

@Controller('/client')
export class ClientController {
    public constructor(
        private readonly clientService: ClientService,
    ) {}

    @Get('/info')
    @UseGuards(AuthGuard('client-key'))
    public getClientInfoFromClient(@CurrentClient() client: ClientDTO) {
        return client;
    }

    @Post('/locker')
    @UseGuards(AuthGuard('client-key'))
    public async lockExecutionTaskChannel(
        @CurrentClient() client: ClientDTO,
        @Query('maximum_retry_times', PermanentlyParseIntPipe) maximumRetryTimes: number,
    ) {
        return await this.clientService.lockExecutionTaskChannel(
            client.id,
            maximumRetryTimes,
        );
    }

    @Delete('/locker')
    @UseGuards(AuthGuard('client-key'))
    public async unlockExecutionTaskChannel(
        @CurrentClient() client: ClientDTO,
        @Body('validation') validationValue: string,
    ) {
        return await this.clientService.unlockExecutionTaskChannel(client.id, validationValue);
    }

    @Post('')
    @UseGuards(AuthGuard())
    public async createClient(
        @Body() configuration: ClientDAO,
        @CurrentUser() user: UserDTO,
    ) {
        return await this.clientService.createClient(user, configuration);
    }

    @Get('/:client_id')
    @UseGuards(AuthGuard())
    public async getClientInfoFromNetwork(
        @Param('client_id') clientId: string,
        @CurrentUser() user: UserDTO,
    ) {
        return await this.clientService.getClientInfoFromNetwork(clientId, user);
    }

    @Post('/challenge')
    @UseGuards(AuthGuard('client-key'))
    public async handleMakeChallenge(@CurrentClient() client: ClientDTO) {
        return await this.clientService.handleMakeChallenge(client);
    }

    @Post('/connected')
    @UseGuards(AuthGuard('client-key'))
    public async handleChannelConnection(
        @CurrentClient() client: ClientDTO,
        @Body('credential') oldCredential: string,
    ) {
        return await this.clientService.handleChannelConnection(client, oldCredential);
    }
}
