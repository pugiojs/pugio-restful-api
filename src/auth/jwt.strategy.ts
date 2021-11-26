import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as BaseStrategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
// import { ManagementClient, User } from 'auth0';
import * as _ from 'lodash';

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    constructor(private readonly configService: ConfigService) {
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

    async validate(payload: JwtPayload) {
        const { sub } = payload;
        if (!sub || !_.isString(sub)) {
            throw new UnauthorizedException();
        }
        return {
            domain: this.configService.get('auth.domain'),
            payload,
        };
    }
}
