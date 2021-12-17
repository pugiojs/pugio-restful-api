import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth0Service } from 'src/auth0/auth0.service';
import * as _ from 'lodash';

@Injectable()
export class AuthService {
    public constructor(
        private readonly auth0Service: Auth0Service,
        private readonly configService: ConfigService,
    ) {}

    /**
     * refresh access token use refresh token
     * @param {string} refreshToken refresh token content
     * @returns {Promise<TokenResponse>} refresh token response
     */
    public async getRefreshedToken(refreshToken: string) {
        if (!this.auth0Service.authenticationClient.oauth || !refreshToken) {
            return {};
        }
        const codeGrantResult = await this.auth0Service.authenticationClient?.oauth.refreshToken({
            refresh_token: refreshToken,
        });
        return codeGrantResult;
    }

    /**
     * get user permissions in current audience
     * @param {string} id user_id from auth0
     * @returns {Promise<string[]>} user permissions names
     */
    public async getUserPermissions(id: string) {
        if (!id || !_.isString(id)) {
            return [];
        }

        const currentAPIAudience = this.configService.get<string>('auth.audience');

        const userPermissions = (
            await this.auth0Service.managementClient.getUserPermissions({ id }) || []
        )
            .filter((permission) => {
                const {
                    permission_name: permissionName,
                    resource_server_identifier: resourceServerIdentifier,
                } = permission;

                /**
                 * filter empty permission name and resource server identifier
                 */
                if (!permissionName || !resourceServerIdentifier) {
                    return false;
                }

                return resourceServerIdentifier === currentAPIAudience;
            })
            .map((permission) => permission.permission_name);

        return userPermissions;
    }
}
