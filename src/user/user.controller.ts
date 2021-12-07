import {
    Body,
    Controller,
    Get,
    Put,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserDAO } from './dao/user.dao';
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
    @Put('/profile')
    public async updateUserProfile(@CurrentUser() user, @Body() userInformation: UserDAO) {
        return await this.userService.updateUserInformation(user.id, userInformation);
    }
}
