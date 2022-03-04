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
import { TRangeItem } from 'src/app.interfaces';
import {
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
    public async queryClients(
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('creator') creatorId: string = null,
        @Query(
            'create_date_range',
            ParseDateRangePipe,
        ) createDateRange: TRangeItem[],
    ) {
        return await this.channelService.queryChannels(creatorId, {
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
        @CurrentClient() client: ClientDTO,
        @Param('client_id') clientId: string = null,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query(
            'create_date_range',
            ParseDateRangePipe,
        ) createDateRange: TRangeItem[],
    ) {
        return await this.channelService.queryClientChannels(client, clientId, {
            size,
            searchContent,
            lastCursor,
            range: {
                createdAt: createDateRange,
            },
        });
    }

    @Get('/:channel_id/detail')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    public async getChannelInfo(@Param('channel_id') channelId: string) {
        return await this.channelService.getChannelInfo(channelId);
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
    @UseInterceptors(ClientInterceptor({
        sources: 'query',
        type: [0, 1],
    }))
    public async getChannelClientRelation(
        @CurrentClient() client: ClientDTO,
        @Param('channel_id') channelId: string,
        @Query('client_id') clientId: string,
    ) {
        return await this.channelService.getChannelClientRelation(channelId, clientId, client);
    }

    @Post('/:channel_id/client')
    @UseGuards(AuthGuard(['client-key', 'api-key', 'jwt']))
    @UseInterceptors(ClientInterceptor({
        sources: 'body',
        type: [0, 1],
    }))
    public async addChannelToClient(
        @Param('channel_id') channelId: string,
        @Body('client_id') clientId: string,
    ) {
        return await this.channelService.addChannelToClient(clientId, channelId);
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
}
