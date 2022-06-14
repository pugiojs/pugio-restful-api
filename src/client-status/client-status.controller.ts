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

    @UseGuards(AuthGuard())
    @Get('/:client_id/system')
    @UseInterceptors(ClientInterceptor({
        sources: 'params',
    }))
    public async getClientSystemStatus(
        @Param('client_id') clientId: string,
        @Query('pathname') pathname: string,
        @Query('date_range', ParseDateRangePipe) dateRange: [Date, Date],
        @Query('count', PermanentlyParseIntPipe) count = 50,
    ) {
        return await this.clientStatusService.getClientSystemStatus(
            clientId,
            pathname,
            dateRange,
            count,
        );
    }
}
