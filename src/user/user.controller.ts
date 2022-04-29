import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
} from 'src/app.pipe';
import { UserDTO } from './dto/user.dto';
import { CurrentUser } from './user.decorator';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
    public constructor(
        private readonly userService: UserService,
    ) {}

    @UseGuards(AuthGuard())
    @Get('/profile')
    public getUserProfile(@CurrentUser() user) {
        return user;
    }

    @UseGuards(AuthGuard())
    @Get('')
    public async queryUsers(
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.userService.queryUsers(
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
}
