import {
    Module,
    Global,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { Oauth2Module } from 'src/oauth2/oauth2.module';

@Global()
@Module({
    imports: [
        ConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        UserModule,
        Oauth2Module,
    ],
    providers: [JwtStrategy, AuthService],
    exports: [PassportModule, JwtStrategy, AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
