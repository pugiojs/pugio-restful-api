import {
    Body,
    Controller,
    Get,
    Inject,
    Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
    @Inject()
    protected authService: AuthService;

    @Post('/refresh')
    public async getRefreshedToken(@Body('refresh_token') refreshToken: string) {
        return await this.authService.getRefreshedToken(refreshToken);
    }

    @Get('/callback')
    public async handleCallback() {
        return {};
    }
}
