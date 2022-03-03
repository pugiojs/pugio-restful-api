import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
} from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientInterceptor } from 'src/client/client.interceptor';
import { ClientDTO } from 'src/client/dto/client.dto';
import { ChannelService } from './channel.service';

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
    @UseGuards(AuthGuard(['api-key', 'jwt']))
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
        type: 0,
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
        const searchClientId = client ? client.id : clientId;

        return await this.channelService.queryClientChannels(searchClientId, {
            size,
            searchContent,
            lastCursor,
            range: {
                createdAt: createDateRange,
            },
        });
    }
}
