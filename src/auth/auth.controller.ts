import {
    Body,
    Controller,
    Get,
    Inject,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import {
    Response,
    Request,
} from 'express';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
    @Inject()
    protected authService: AuthService;

    @Get('/exchange_token')
    public async getExchangeAccessToken(@Req() request: Request) {
        const jwtContent = request.headers.authorization.replace('Bearer ', '');
        return await this.authService.getExchangedAccessToken(jwtContent);
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
        @Res() response: Response,
    ) {
        response.cookie('id', 'fuck', {
            domain: '.permbase.lenconda.top',
            sameSite: 'none',
        });
        return response.redirect('https://permbase.lenconda.top');
    }
}
