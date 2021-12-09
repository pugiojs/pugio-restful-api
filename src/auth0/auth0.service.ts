import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AuthenticationClient,
    AuthenticationClientOptions,
    ManagementClient,
    ManagementClientOptions,
} from 'auth0';
import {
    ERR_AUTH_CLIENT_CREATION,
    ERR_AUTH_CLIENT_NOT_FOUND,
} from 'src/app.constants';

interface ClientOptions {
    clientId: string;
    clientSecret: string;
    domain: string;
}

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

    public async createAuthenticationClient(clientId: string) {
        const clientOptions = await this.getClientOptions(clientId);

        if (!clientOptions) {
            throw new InternalServerErrorException(ERR_AUTH_CLIENT_CREATION);
        }

        return new AuthenticationClient(clientOptions);
    }

    public async createManagementClient(clientId: string) {
        const clientOptions = await this.getClientOptions(clientId);

        if (!clientOptions) {
            throw new InternalServerErrorException(ERR_AUTH_CLIENT_CREATION);
        }

        return new ManagementClient(clientOptions);
    }

    private async getClientOptions(clientId: string): Promise<ClientOptions> {
        if (!clientId) {
            return null;
        }

        const clientInfo = await this.managementClient.getClient({
            client_id: clientId,
        });

        if (!clientInfo) {
            throw new InternalServerErrorException(ERR_AUTH_CLIENT_NOT_FOUND);
        }

        const domain = this.configService.get('auth.domain');

        const {
            client_secret: clientSecret,
        } = clientInfo;

        return {
            clientId,
            clientSecret,
            domain,
        };
    }
}
