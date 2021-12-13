import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import * as _ from 'lodash';
import { UtilService } from 'src/util/util.service';
import {
    ERR_AUTH_CLIENT_NOT_FOUND,
    ERR_AUTH_INVALID_GRANT,
    ERR_AUTH_OPEN_ID_INVALID,
    ERR_AUTH_TOKEN_PARSE_ERROR,
    ERR_PARAM_PARSE_FAILED,
    ERR_PARAM_VALIDATION_FAILED,
    ERR_SIGN_PAYLOAD_NOT_FOUND,
} from 'src/app.constants';
import { ConfigService } from '@nestjs/config';
import * as yup from 'yup';
import { Auth0Service } from 'src/auth0/auth0.service';
import axios from 'axios';
import * as qs from 'qs';
import { URL } from 'url';

interface CallbackStateSchema {
    clientId: string;
    vendor?: {
        origin?: string;
        pathname?: string;
        data?: string;
    };
}

@Injectable()
export class AuthService {
    public constructor(
        private readonly utilService: UtilService,
        private readonly configService: ConfigService,
        private readonly auth0Service: Auth0Service,
    ) {}

    /**
     * use Auth0 access token to generate a new token that can be recognized
     * by Lenconda Account Center
     * @param {string} token access token from Auth0 tenants
     * @returns {Promise}
     */
    public async getExchangedAccessToken(token: string) {
        if (!token) {
            throw new BadRequestException();
        }

        const [, payload] = token.split('.');
        let audience: string;

        if (!payload) {
            throw new InternalServerErrorException(ERR_SIGN_PAYLOAD_NOT_FOUND);
        }

        try {
            const { aud } = JSON.parse(Buffer.from(payload, 'base64').toString());
            audience = aud;
        } catch (e) {
            throw new InternalServerErrorException(ERR_AUTH_TOKEN_PARSE_ERROR);
        }

        const {
            sub: openId,
        } = await this.utilService.validateAuth0AccessToken(token, audience);

        if (!openId) {
            throw new InternalServerErrorException(ERR_AUTH_OPEN_ID_INVALID);
        }

        return {
            token: this.utilService.signAccountCenterToken(openId),
            expiresIn: this.configService.get('sign.expiration'),
        };
    }

    public async authenticationHandler(code: string, state: string) {
        const stateSchema = yup.object().shape({
            clientId: yup.string().required(),
            redirectUri: yup.string().required(),
            vendor: yup.object().shape({
                origin: yup.string().optional(),
                pathname: yup.string().optional(),
                data: yup.string().optional(),
            }).optional(),
        });

        if (!state || !_.isString(state)) {
            throw new BadRequestException(ERR_PARAM_VALIDATION_FAILED);
        }

        const defaultClientId = this.configService.get('auth.clientId');
        let stateParams: CallbackStateSchema = {
            clientId: defaultClientId,
            vendor: {
                origin: this.configService.get('sign.issuer'),
                pathname: '/vendor/check_in',
            },
        };

        try {
            stateParams = _.merge(stateParams, JSON.parse(Buffer.from(state, 'base64').toString()));
        } catch (e) {
            throw new InternalServerErrorException(ERR_PARAM_PARSE_FAILED);
        }

        try {
            stateSchema.isValid(stateParams);
        } catch (e) {
            throw new BadRequestException(ERR_PARAM_VALIDATION_FAILED, e.message || e.toString());
        }

        let clientSecret: string;

        if (stateParams.clientId === defaultClientId) {
            clientSecret = this.configService.get('auth.clientSecret');
        } else {
            const {
                client_secret,
            } = await this.auth0Service.managementClient.getClient({
                client_id: stateParams.clientId,
            });

            clientSecret = client_secret;
        }

        if (!clientSecret) {
            throw new InternalServerErrorException(ERR_AUTH_CLIENT_NOT_FOUND);
        }

        const {
            data: oauthTokenResponseData,
        } = await axios.post(
            `https://${this.configService.get('auth.domain')}/oauth/token`,
            qs.stringify(this.utilService.transformDTOToDAO({
                code,
                clientId: stateParams.clientId,
                clientSecret,
                grantType: 'authorization_code',
                redirectUri: `${this.configService.get('auth.audience')}auth/callback`,
            })),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                responseType: 'json',
            },
        );

        if (oauthTokenResponseData.error) {
            throw new InternalServerErrorException(ERR_AUTH_INVALID_GRANT, oauthTokenResponseData.error_description);
        }

        const callbackURLParser = new URL(stateParams.vendor.origin);
        callbackURLParser.pathname = _.get(stateParams, 'vendor.pathname') || '';
        callbackURLParser.search = '?' + qs.stringify({
            data: stateParams.vendor.data,
            ...oauthTokenResponseData,
        });

        return callbackURLParser.toString();
    }
}
