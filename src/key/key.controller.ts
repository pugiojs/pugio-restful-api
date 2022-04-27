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
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
} from 'src/app.pipe';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { KeyService } from './key.service';

@Controller('/keys')
export class KeyController {
    public constructor(
        private readonly keyService: KeyService,
    ) {}

    @UseGuards(AuthGuard())
    @Get('')
    public async queryApiKeys(
        @CurrentUser() user: UserDTO,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.keyService.queryApiKeys(
            user,
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
    @Post('/ensure/:scope_id')
    public async ensureSingleScopedApiKey(
        @CurrentUser() user: UserDTO,
        @Param('scope_id') scopeId: string,
    ) {
        return await this.keyService.ensureSingleScopedApiKey(user, scopeId);
    }

    @UseGuards(AuthGuard())
    @Post('')
    public async createApiKey(
        @CurrentUser() user: UserDTO,
        @Body('scopes') scopes: string[] = [],
    ) {
        return await this.keyService.createApiKey(user, scopes);
    }

    @UseGuards(AuthGuard())
    @Delete('/:id')
    public async deleteApiKey(
        @CurrentUser() user: UserDTO,
        @Param('id') keyId: string,
    ) {
        return await this.keyService.deleteApiKeys(user, [keyId]);
    }

    @UseGuards(AuthGuard())
    @Delete('')
    public async deleteApiKeys(
        @CurrentUser() user: UserDTO,
        @Body('keys') keyIdentifierList: string[],
    ) {
        return await this.keyService.deleteApiKeys(user, keyIdentifierList);
    }
}
