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
import axios from 'axios';
import * as qs from 'qs';
import { URL } from 'url';
import { Oauth2Service } from 'src/oauth2/oauth2.service';
import * as fs from 'fs-extra';
import * as jwt from 'jsonwebtoken';
import * as urlJoin from 'url-join/lib/url-join';

interface CallbackStateSchema {
    clientId: string;
    vendor?: {
        origin?: string;
        check_in_path?: string;
        checked_in_redirect_path?: string;
    };
}

@Injectable()
export class AuthService {
    public constructor(
        private readonly utilService: UtilService,
        private readonly configService: ConfigService,
        private readonly oauth2Service: Oauth2Service,
    ) {}

    public signAccountCenterToken(openId: string) {
        const privateKey = fs.readFileSync(this.configService.get('sign.privateKeyPathname'));

        if (!openId || !privateKey) {
            return null;
        }

        const token = jwt.sign(
            {
                sub: openId,
            },
            privateKey,
            {
                algorithm: 'RS256',
                audience: this.configService.get('auth.audience'),
                expiresIn: this.configService.get('sign.expiration'),
                issuer: this.configService.get('sign.issuer'),
            },
        );

        return token;
    }

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
        let audience: string | string[];

        if (!payload) {
            throw new InternalServerErrorException(ERR_SIGN_PAYLOAD_NOT_FOUND);
        }

        try {
            const {
                aud,
            } = JSON.parse(Buffer.from(payload, 'base64').toString()) as jwt.JwtPayload;
            audience = aud;
        } catch (e) {
            throw new InternalServerErrorException(ERR_AUTH_TOKEN_PARSE_ERROR);
        }

        const {
            sub: openId,
        } = await this.oauth2Service.validateOauth2AccessToken(token, audience);

        if (!openId) {
            throw new InternalServerErrorException(ERR_AUTH_OPEN_ID_INVALID);
        }

        return {
            token: this.signAccountCenterToken(openId),
            expiresIn: this.configService.get('sign.expiration'),
        };
    }

    public generateNewToken(openId: string) {
        if (!openId) {
            return {};
        }

        return {
            token: this.signAccountCenterToken(openId),
            expiresIn: this.configService.get('sign.expiration'),
        };
    }

    public async authenticationHandler(code: string, state: string) {
        const stateSchema = yup.object().shape({
            clientId: yup.string().required(),
            vendor: yup.object().shape({
                origin: yup.string().optional(),
                check_in_path: yup.string().optional(),
                checked_in_redirect_path: yup.string().optional(),
            }).optional(),
        });

        if (!state || !_.isString(state)) {
            throw new BadRequestException(ERR_PARAM_VALIDATION_FAILED);
        }

        const defaultClientId = this.configService.get('auth.clientId');
        let stateParams: CallbackStateSchema = {
            clientId: defaultClientId,
            vendor: {
                origin: this.configService.get('app.origin'),
                check_in_path: '/endpoints/check_in',
                checked_in_redirect_path: '/',
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
            const application = await this.oauth2Service
                .getClient()
                .retrieveApplication(stateParams.clientId)
                .then((response) => response.response?.application);

            if (!application) {
                throw new InternalServerErrorException(ERR_AUTH_CLIENT_NOT_FOUND);
            }

            clientSecret = application?.oauthConfiguration?.clientSecret;
        }

        if (!clientSecret) {
            throw new InternalServerErrorException(ERR_AUTH_CLIENT_NOT_FOUND);
        }

        try {
            const {
                data: oauthTokenResponseData,
            } = await axios.post(
                `https://${this.configService.get('auth.domain')}${this.configService.get('auth.tokenEndpoint')}`,
                qs.stringify(this.utilService.transformDTOToDAO({
                    code,
                    clientId: stateParams.clientId,
                    clientSecret,
                    grantType: 'authorization_code',
                    redirectUri: this.configService.get('auth.defaultRedirectUri'),
                })),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    responseType: 'json',
                },
            );

            const callbackURLParser = new URL(
                urlJoin(
                    'https://' + stateParams.vendor.origin,
                    stateParams.vendor.check_in_path,
                ),
            );
            callbackURLParser.search = '?' + qs.stringify({
                ...oauthTokenResponseData,
                return_to: stateParams.vendor.checked_in_redirect_path,
            });
            return callbackURLParser.toString();
        } catch (e) {
            throw new InternalServerErrorException(ERR_AUTH_INVALID_GRANT, e.message || e.toString());
        }
    }
}
