import { Injectable } from '@nestjs/common';
// import { Auth0Service } from 'src/auth0/auth0.service';

@Injectable()
export class VendorService {
    // public constructor(
    //     private readonly auth0Service: Auth0Service,
    // ) {}

    /**
     * refresh access token use refresh token
     * @param {string} refreshToken refresh token content
     * @param {string} clientId auth client id
     * @returns {Promise<TokenResponse>} refresh token response
     */
    public async getRefreshedToken(refreshToken: string, clientId?: string) {
        // const authenticationClient = clientId
        //     ? await this.auth0Service.createAuthenticationClient(clientId)
        //     : this.auth0Service.authenticationClient;

        // if (
        //     !refreshToken ||
        //         !authenticationClient ||
        //         !authenticationClient.oauth
        // ) {
        //     return {};
        // }

        // const codeGrantResult = await authenticationClient?.oauth.refreshToken({
        //     refresh_token: refreshToken,
        // });

        // return codeGrantResult;
    }
}
