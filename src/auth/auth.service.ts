import { Injectable } from '@nestjs/common';
import { Auth0Service } from 'src/auth0/auth0.service';
import * as _ from 'lodash';

@Injectable()
export class AuthService {
    public constructor(
        private readonly auth0Service: Auth0Service,
    ) {}

    /**
     * refresh access token use refresh token
     * @param {string} refreshToken refresh token content
     * @param {string} clientId auth client id
     * @returns {Promise<TokenResponse>} refresh token response
     */
    public async getRefreshedToken(refreshToken: string, clientId?: string) {
        const authenticationClient = clientId
            ? await this.auth0Service.createAuthenticationClient(clientId)
            : this.auth0Service.authenticationClient;

        if (
            !refreshToken ||
            !authenticationClient ||
            !authenticationClient.oauth
        ) {
            return {};
        }

        const codeGrantResult = await authenticationClient?.oauth.refreshToken({
            refresh_token: refreshToken,
        });

        return codeGrantResult;
    }

    public async getExchangedAccessToken() {}

    // /**
    //  * get user permissions in current audience
    //  * @param {string} id user_id from auth0
    //  * @param {string} audience current auth client audience API URI
    //  * @returns {Promise<string[]>} user permissions names
    //  */
    // public async getUserPermissions(id: string, audience: string) {
    //     if (!id || !_.isString(id)) {
    //         return [];
    //     }

    //     const userPermissions = (await this.auth0Service.managementClient.getUserPermissions({ id }) || [])
    //         .filter((permission) => {
    //             const {
    //                 permission_name: permissionName,
    //                 resource_server_identifier: resourceServerIdentifier,
    //             } = permission;

    //             /**
    //              * filter empty permission name and resource server identifier
    //              */
    //             if (!permissionName || !resourceServerIdentifier) {
    //                 return false;
    //             }

    //             return resourceServerIdentifier === audience;
    //         })
    //         .map((permission) => permission.permission_name);

    //     return userPermissions;
    // }
}
