import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/permissions/permissions.guard';
import { CurrentUser } from './user.decorator';

@Controller('/user')
export class UserController {
    @UseGuards(AuthGuard())
    @Get('/profile')
    getUserProfile(@CurrentUser() user) {
        return user;
    }

    @UseGuards(AuthGuard(), PermissionsGuard)
    @Get('/test')
    @Permissions('test:1')
    async getTest() {
        return {};
    }
}
