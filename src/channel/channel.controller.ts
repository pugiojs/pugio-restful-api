import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Method } from 'axios';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseBooleanPipe,
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
    TransformDTOPipe,
} from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientInterceptor } from 'src/client/client.interceptor';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { ChannelService } from './channel.service';
import { ChannelDTO } from './dto/channel.dto';

@Controller('/channel')
export class ChannelController {
    public constructor(
        private readonly channelService: ChannelService,
    ) {}

    @Get('')
    @UseGuards(AuthGuard())
    public async queryChannels(
        @CurrentUser() user: UserDTO,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('creator') creatorId: string = null,
        @Query('status', PermanentlyParseIntPipe) status,
        @Query(
            'create_date_range',
            ParseDateRangePipe,
        ) createDateRange: TRangeItem[],
    ) {
        return await this.channelService.queryChannels(user, creatorId, {
            queryOptions: {
                where: {
                    status,
                },
            },
            size,
            searchContent,
            lastCursor,
            range: {
                createdAt: createDateRange,
            },
        });
    }

    @Get('/:client_id')
    @UseGuards(AuthGuard())
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        type: -1,
    }))
    public async queryClientChannels(
        @Param('client_id') clientId: string = null,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('built_in', ParseBooleanPipe) builtIn: boolean,
        @Query('status', PermanentlyParseIntPipe) status,
        @Query(
            'create_date_range',
            ParseDateRangePipe,
        ) createDateRange: TRangeItem[],
    ) {
        return await this.channelService.queryClientChannels(clientId, {
            builtIn,
            size,
            searchContent,
            lastCursor,
            status,
            range: {
                createdAt: createDateRange,
            },
        });
    }

    @Get('/:channel_id/detail')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    public async getChannelInfo(
        @CurrentUser() user: UserDTO,
        @Param('channel_id') channelId: string,
    ) {
        return await this.channelService.getChannelInfo(user, channelId);
    }

    @Post('')
    @UseGuards(AuthGuard())
    public async createChannel(
        @CurrentUser() creator: UserDTO,
        @Body(TransformDTOPipe) data: Partial<ChannelDTO> = {},
    ) {
        return await this.channelService.createChannel(creator, data);
    }

    @Patch('/:channel_id')
    @UseGuards(AuthGuard())
    public async updateChannel(
        @CurrentUser() updater: UserDTO,
        @Param('channel_id') channelId: string,
        @Body(TransformDTOPipe) data: Partial<ChannelDTO> = {},
    ) {
        return await this.channelService.updateChannel(updater, channelId, data);
    }

    @Get('/:channel_id/client')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    public async getChannelClientRelation(
        @Param('channel_id') channelId: string,
        @Query('client_id') clientId: string,
        @CurrentClient() client: ClientDTO,
    ) {
        return await this.channelService.getChannelClientRelation(channelId, clientId, client);
    }

    @Post('/:channel_id/client')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    public async addChannelToClient(
        @CurrentUser() user: UserDTO,
        @Param('channel_id') channelId: string,
        @Body('client_id_list') clientIdList: string | string[],
    ) {
        return await this.channelService.addChannelToClients(user, clientIdList, channelId);
    }

    @Delete('/:channel_id/client')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    @UseInterceptors(ClientInterceptor({
        sources: 'body',
        type: [0, 1],
    }))
    public async removeChannelFromClient(
        @Param('channel_id') channelId: string,
        @Body('client_id') clientId: string,
    ) {
        return await this.channelService.removeChannelFromClient(clientId, channelId);
    }

    @Post('/:channel_id/api')
    @UseGuards(AuthGuard(['api-key', 'client-key', 'jwt']))
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        type: -1,
    }))
    public async requestChannelApi(
        @CurrentUser() user: UserDTO,
        @CurrentClient() client: ClientDTO,
        @Param('channel_id') channelId: string,
        @Query('client_id') clientId: string,
        @Body('pathname') pathname: string,
        @Body('method') method: Method,
        @Body('data') data: Record<string, any> = {},
        @Body('query') query: Record<string, any> = {},
    ) {
        return await this.channelService.requestChannelApi({
            client,
            user,
            channelId,
            clientId,
            pathname,
            method,
            data,
            query,
        });
    }
}
