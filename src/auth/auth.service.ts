import { Injectable } from '@nestjs/common';
import { Auth0Service } from 'src/auth0/auth0.service';

@Injectable()
export class AuthService {
    public constructor(private readonly auth0Service: Auth0Service) {}

    public async getRefreshedToken(refreshToken: string) {
        if (!this.auth0Service.authenticationClient.oauth || !refreshToken) {
            return {};
        }
        const codeGrantResult = await this.auth0Service.authenticationClient?.oauth.refreshToken({
            refresh_token: refreshToken,
        });
        return codeGrantResult;
    }
}
