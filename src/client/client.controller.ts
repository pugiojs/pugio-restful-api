import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    ParseQueryArrayPipe,
    PermanentlyParseIntPipe,
    TransformDTOPipe,
} from 'src/app.pipe';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { CurrentClient } from './client.decorator';
import { ClientInterceptor } from './client.interceptor';
import { ClientService } from './client.service';
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
        @CurrentUser() user: UserDTO,
        @Body(TransformDTOPipe) configuration: Partial<ClientDTO>,
    ) {
        return await this.clientService.createClient(user, configuration);
    }

    @Patch('/:client_id')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        paths: '$.client_id',
        type: [0, 1],
    }))
    public async updateClient(
        @Param('client_id') clientId: string,
        @Body(TransformDTOPipe) updates: Partial<ClientDTO>,
    ) {
        return await this.clientService.updateClient(clientId, updates);
    }

    @Get('/:client_id')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
    }))
    public async getClientInfoFromNetwork(
        @Param('client_id') clientId: string,
        @CurrentUser() user: UserDTO,
    ) {
        return await this.clientService.getClientInfoFromNetwork(clientId, user);
    }

    @Post('/challenge')
    @UseGuards(AuthGuard('client-key'))
    public async handleMakeChallenge(
        @CurrentClient() client: ClientDTO,
        @Body('device_id') deviceId: string,
        @Body('version') version: string,
    ) {
        return await this.clientService.handleMakeChallenge(client, deviceId, version);
    }

    @Post('/connected')
    @UseGuards(AuthGuard('client-key'))
    public async handleChannelConnection(
        @CurrentClient() client: ClientDTO,
        @Body('credential') oldCredential: string,
    ) {
        return await this.clientService.handleChannelConnection(client, oldCredential);
    }

    @Get('')
    @UseGuards(AuthGuard())
    public async queryClients(
        @CurrentUser() user: UserDTO,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query(
            'roles',
            ParseQueryArrayPipe,
            PermanentlyParseIntPipe,
        ) roles: number[] = [],
        @Query(
            'create_date_range',
            ParseDateRangePipe,
        ) createDateRange: TRangeItem[],
    ) {
        return await this.clientService.queryClients(user, roles, {
            size,
            searchContent,
            lastCursor,
            range: {
                createdAt: createDateRange,
            },
        });
    }

    @Put('/:client_id/membership')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        type: 0,
    }))
    public async handleTransferOwnership(
        @CurrentUser() user: UserDTO,
        @Param('client_id') clientId: string,
        @Body('owner') ownerId: string,
    ) {
        return await this.clientService.handleCreateMembership(
            user,
            clientId,
            ownerId,
            0,
        );
    }

    @Post('/:client_id/membership')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
    }))
    public async handleCreateMembership(
        @CurrentUser() user: UserDTO,
        @Param('client_id') clientId: string,
        @Body('new_user') newUserId: string,
        @Body('role_type', PermanentlyParseIntPipe) roleType: number,
    ) {
        return await this.clientService.handleCreateMembership(
            user,
            clientId,
            newUserId,
            roleType || 2,
        );
    }

    @Delete('/:client_id/membership/:target_user_id?')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        type: [0, 1],
    }))
    public async handleDeleteMemberRelationship(
        @CurrentUser() user: UserDTO,
        @Param('client_id') clientId: string,
        @Param('target_user_id') targetUserIdFromParam?: string,
        @Body('users') targetUserIdListFromBody?: string[],
    ) {
        return await this.clientService.handleDeleteMemberRelationship(
            user,
            clientId,
            targetUserIdFromParam || targetUserIdListFromBody,
        );
    }

    @Post('/:client_id/verify')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: ['params'],
        type: [0, 1],
    }))
    public async verifyClient(
        @Param('client_id') clientId: string,
        @Body('device_id') deviceId: string,
    ) {
        return await this.clientService.verifyClient(clientId, deviceId);
    }

    @Post('/:client_id/response/:scope/:request_id')
    @UseGuards(AuthGuard('client-key'))
    @UseInterceptors(ClientInterceptor({
        sources: ['params'],
    }))
    public async pushChannelResponse(
        @Param('client_id') clientId: string,
        @Param('scope') scope: string,
        @Param('request_id') requestId: string,
        @Body() responseBody: any,
    ) {
        return await this.clientService.pushChannelResponse(clientId, scope, requestId, responseBody);
    }

    @Post('/:client_id/channel')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: ['params'],
        type: [0, 1],
    }))
    public async requestClientChannel(
        @Param('client_id') clientId: string,
        @Body('scope') scope: string,
        @Body('data') requestBody: any = {},
    ) {
        return await this.clientService.requestClientChannel({
            clientId,
            scope,
            requestBody,
        });
    }
}
