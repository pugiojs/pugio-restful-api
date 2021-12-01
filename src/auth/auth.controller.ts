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
    authService: AuthService;

    @Post('/refresh')
    async getRefreshedToken(@Body('refresh_token') refreshToken: string) {
        return await this.authService.getRefreshedToken(refreshToken);
    }

    @Get('/callback')
    async handleCallback() {
        return {};
    }
}
