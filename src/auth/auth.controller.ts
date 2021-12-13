import {
    Controller,
    Get,
    Inject,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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

    // TODO
    @UseGuards(AuthGuard())
    @Get('/refresh_token')
    public async refreshToken() {}

    @Get('/callback')
    public async handleAuthenticationCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() response: Response,
    ) {
        const redirectURI = await this.authService.authenticationHandler(code, state);
        return response.redirect(redirectURI);
    }
}
