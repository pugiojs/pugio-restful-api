import {
    Module,
    Global,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import authConfig from '../config/auth.config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';

@Global()
@Module({
    imports: [
        ConfigModule.forFeature(authConfig),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        UserModule,
    ],
    providers: [JwtStrategy, AuthService],
    exports: [PassportModule, JwtStrategy, AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
