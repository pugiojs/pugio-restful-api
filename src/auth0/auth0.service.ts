import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AuthenticationClient,
    AuthenticationClientOptions,
    ManagementClient,
    ManagementClientOptions,
} from 'auth0';

@Injectable()
export class Auth0Service {
    private authentication: AuthenticationClient;
    private management: ManagementClient;

    public constructor(
        private readonly configService: ConfigService,
    ) {
        const authenticationClientOptions = [
            'domain',
            'clientId',
            'clientSecret',
        ].reduce((result, currentKey) => {
            result[currentKey] = this.configService.get(`auth.${currentKey}`);
            return result;
        }, {} as AuthenticationClientOptions);
        const managementClientOptions = [
            'domain',
            'clientId',
            'clientSecret',
        ].reduce((result, currentKey) => {
            result[currentKey] = this.configService.get(`auth.${currentKey}`);
            return result;
        }, {} as ManagementClientOptions);

        this.authentication = new AuthenticationClient(authenticationClientOptions);
        this.management = new ManagementClient(managementClientOptions);
    }

    public get authenticationClient() {
        return this.authentication;
    }

    public get managementClient() {
        return this.management;
    }
}
