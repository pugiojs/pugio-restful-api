import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import authConfig from '../config/auth.config';

import { JwtStrategy } from './jwt.strategy';

@Global()
@Module({
    imports: [
        ConfigModule.forFeature(authConfig),
        PassportModule.register({ defaultStrategy: 'jwt' }),
    ],
    providers: [JwtStrategy],
    exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}
