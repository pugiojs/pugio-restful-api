import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as _ from 'lodash';
import { UserDAO } from 'src/user/dao/user.dao';
import { UtilService } from 'src/util/util.service';
import { UserDTO } from 'src/user/dto/user.dto';
import {
    ERR_AUTH_EMAIL_NOT_VERIFIED,
} from 'src/app.constants';
import { Auth0Service } from 'src/auth0/auth0.service';
import * as fs from 'fs-extra';

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    public constructor(
        private readonly configService: ConfigService,
        private readonly utilService: UtilService,
        private readonly auth0Service: Auth0Service,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: configService.get<string>('auth.audience'),
            issuer: configService.get<string>('sign.issuer'),
            algorithms: ['RS256'],
            secretOrKey: fs.readFileSync(configService.get<string>('sign.publicKeyPathname')),
        });
    }

    public async validate(payload: JwtPayload) {
        const { sub: id } = payload;

        if (!id || !_.isString(id)) {
            throw new UnauthorizedException();
        }

        const userInfoTag = this.configService.get('auth.userinfoTag');
        let userInfo: Record<string, any>;
        userInfo = payload[userInfoTag] as Record<string, any>;

        if (!userInfo) {
            userInfo = await this.auth0Service.managementClient.getUser({ id });
        }

        if (!userInfo) {
            throw new UnauthorizedException();
        }

        if (_.isBoolean(userInfo.email_verified) && !userInfo.email_verified) {
            throw new ForbiddenException(ERR_AUTH_EMAIL_NOT_VERIFIED);
        }

        const currentUserDAO = this.utilService.getUserDAOFromAuth0Response(userInfo);
        const currentUserDTO = this.utilService.transformDAOToDTO<UserDAO, UserDTO>(currentUserDAO);

        return currentUserDTO;
    }
}
