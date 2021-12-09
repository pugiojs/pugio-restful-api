import {
    Body,
    Controller,
    Get,
    Inject,
    Post,
    Query,
    Res,
} from '@nestjs/common';
// import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
    @Inject()
    protected authService: AuthService;

    // TODO
    @Post('/exchange_token')
    public async getExchangeToken() {

    }

    @Post('/refresh_token')
    public async getRefreshedToken(
        @Body('refresh_token') refreshToken: string,
        @Body('client_id') clientId: string,
    ) {
        return await this.authService.getRefreshedToken(refreshToken, clientId);
    }

    @Get('/callback')
    public async handleAuthenticationCallback(
        @Query('code') code: string,
        @Query('client_id') clientId: string,
        @Query('redirect_uri') redirectURI: string,
    ) {
        return {
            code,
            clientId,
            redirectURI,
        };
    }
}
