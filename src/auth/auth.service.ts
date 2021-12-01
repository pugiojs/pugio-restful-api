import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AuthenticationClient,
    AuthenticationClientOptions,
} from 'auth0';

@Injectable()
export class AuthService {
    private authenticationClient: AuthenticationClient;

    public constructor(private readonly configService: ConfigService) {
        const authenticationClientOptions = [
            'domain',
            'clientId',
            'clientSecret',
        ].reduce((result, currentKey) => {
            result[currentKey] = this.configService.get(`auth.${currentKey}`);
            return result;
        }, {} as AuthenticationClientOptions);

        this.authenticationClient = new AuthenticationClient(authenticationClientOptions);
    }

    public async getRefreshedToken(refreshToken: string) {
        if (!this.authenticationClient.oauth || !refreshToken) {
            return {};
        }
        const codeGrantResult = await this.authenticationClient?.oauth.refreshToken({
            refresh_token: refreshToken,
        });
        return codeGrantResult;
    }
}
