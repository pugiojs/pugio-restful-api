import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import * as _ from 'lodash';
import { UtilService } from 'src/util/util.service';
import {
    ERR_AUTH_OPEN_ID_INVALID,
    ERR_AUTH_TOKEN_PARSE_ERROR,
    ERR_SIGN_PAYLOAD_NOT_FOUND,
} from 'src/app.constants';

@Injectable()
export class AuthService {
    public constructor(
        private readonly utilService: UtilService,
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

        const { sub: openId } = await this.utilService.validateAuth0AccessToken(token, audience);

        if (!openId) {
            throw new InternalServerErrorException(ERR_AUTH_OPEN_ID_INVALID);
        }

        return {
            token: this.utilService.signAccountCenterToken(openId),
        };
    }
}
