import {
    Controller,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { KeyService } from './key.service';

@Controller('/keys')
export class KeyController {
    public constructor(
        private readonly keyService: KeyService,
    ) {}

    @UseGuards(AuthGuard())
    @Post('')
    public async createApiKey(@CurrentUser() user: UserDTO) {
        return await this.keyService.createApiKey(user);
    }
}
