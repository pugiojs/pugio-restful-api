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
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
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

    @UseGuards(AuthGuard())
    @Get('/refresh_token')
    public refreshToken(@CurrentUser() user: UserDTO) {
        return this.authService.generateNewToken(user.openId);
    }

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
