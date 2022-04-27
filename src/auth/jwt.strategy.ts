import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as _ from 'lodash';
import { UserService } from '../user/user.service';
import {
    ERR_AUTH_EMAIL_NOT_VERIFIED,
} from 'src/app.constants';
import axios from 'axios';
import { UserDAO } from 'src/user/dao/user.dao';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    public constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly utilService: UtilService,
    ) {
        super({
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${configService.get<string>(
                    'auth.domain',
                )}/.well-known/jwks.json`,
            }),

            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: configService.get<string>('auth.audience'),
            issuer: configService.get<string>('auth.jwtIssuer'),
            algorithms: ['RS256'],
        });
    }

    public async validate(payload: JwtPayload) {
        const { sub: id } = payload;

        if (!id || !_.isString(id)) {
            throw new UnauthorizedException();
        }

        try {
            const accountCenterApi = this.configService.get<string>('auth.accountCenterApi');
            const { data } = await axios.get<UserDAO>(
                `${accountCenterApi}/vendor/profile?id=${id}&key=${this.configService.get('auth.apiKey')}`,
                {
                    responseType: 'json',
                },
            );

            if (!data.verified) {
                throw new ForbiddenException(ERR_AUTH_EMAIL_NOT_VERIFIED);
            }

            const userInfoData = this.utilService.transformDAOToDTO(data);
            const result = await this.userService.syncUserInformation(userInfoData);

            return result;
        } catch (e) {
            throw new InternalServerErrorException(e);
        }
    }
}
