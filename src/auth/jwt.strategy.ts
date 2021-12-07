import {
    Injectable,
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
import { UserDAO } from 'src/user/dao/user.dao';
import { UtilService } from 'src/util/util.service';
import { UserDTO } from 'src/user/dto/user.dto';

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
            issuer: `https://${configService.get<string>('auth.domain')}/`,
            algorithms: ['RS256'],
        });
    }

    public validate(payload: JwtPayload) {
        const { sub: id } = payload;

        if (!id || !_.isString(id)) {
            throw new UnauthorizedException();
        }

        const userInfoTag = this.configService.get('auth.userinfoTag');
        const userInfo = payload[userInfoTag];
        const permissions = payload['permissions'] || [];

        if (!userInfo) {
            throw new UnauthorizedException();
        }

        const currentUserDAO = this.utilService.getUserDAOFromAuth0Response(userInfo);
        const currentUserDTO = this.utilService.transformDAOToDTO<UserDAO, UserDTO>(currentUserDAO);
        this.userService.syncUserInformation(_.omit(currentUserDTO, ['createdAt', 'updatedAt']));

        return { ...currentUserDTO, permissions };
    }
}
