import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './user.decorator';

@Controller('/user')
export class UserController {
    @UseGuards(AuthGuard())
    @Get('/profile')
    getUserProfile(@CurrentUser() user) {
        return user;
    }
}
