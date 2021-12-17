import {
    Body,
    Controller,
    Get,
    Patch,
    Put,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CamelCasePipe } from 'src/case.pipe';
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
    @Patch('/profile')
    public async updateUserProfile(
        @CurrentUser() user: UserDTO,
        @Body(CamelCasePipe) userInformation: UserDTO,
    ) {
        return await this.userService.updateUserInformation(
            user.email,
            user.openId,
            userInformation,
        );
    }

    @UseGuards(AuthGuard())
    @Put('/password')
    public async changeUserPassword(@CurrentUser() user: UserDTO) {
        const email = user.email;
        return await this.userService.changeUserPassword(email);
    }
}
