import {
    Controller,
    Get,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermanentlyParseIntPipe } from 'src/app.pipe';
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
        @Query('page', PermanentlyParseIntPipe) page = 10,
        @Query('timestamp', PermanentlyParseIntPipe) timestamp = -1,
        @Query('search') searchContent: string,
    ) {
        return await this.keyService.queryApiKeys(
            user,
            page,
            size,
            timestamp,
            searchContent,
        );
    }

    @UseGuards(AuthGuard())
    @Post('')
    public async createApiKey(@CurrentUser() user: UserDTO) {
        return await this.keyService.createApiKey(user);
    }
}
