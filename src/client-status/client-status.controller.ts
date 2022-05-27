import {
    Body,
    Controller,
    Get,
    Param,
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
} from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientInterceptor } from 'src/client/client.interceptor';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { ClientStatusService } from './client-status.service';

@Controller('/client_status')
export class ClientStatusController {
    public constructor(
        private readonly clientStatusService: ClientStatusService,
    ) {}

    @Post('')
    @UseGuards(AuthGuard('client-key'))
    public async reportClientStatus(
        @CurrentUser() reporter: UserDTO,
        @CurrentClient() client: ClientDTO,
        @Body('plaintext') plaintext: string,
        @Body('cipher') cipher: string,
        @Body('system') system: string,
    ) {
        return await this.clientStatusService.reportClientStatus(
            reporter,
            client,
            plaintext,
            cipher,
            system,
        );
    }

    @UseGuards(AuthGuard())
    @Get('/:client_id/all')
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
    }))
    public async queryClientStatuses(
        @Param('client_id') clientId: string,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.clientStatusService.queryClientStatuses(
            clientId,
            {
                size,
                lastCursor,
                searchContent,
                range: {
                    createdAt: createDateRange,
                },
            },
        );
    }

    @UseGuards(AuthGuard())
    @Get('/:client_id')
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
    }))
    public async getClientCurrentStatus(
        @Param('client_id') clientId: string,
        @Query('offline_threshold', PermanentlyParseIntPipe) offlineThreshold = 6000,
    ) {
        return await this.clientStatusService.getClientCurrentStatus(clientId, offlineThreshold);
    }
}
