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
import { ApiKeyStrategy } from './api-key.strategy';
import { KeyModule } from 'src/key/key.module';
import { ClientKeyStrategy } from './client-key.strategy';
import { ChannelKeyStrategy } from './channel-key.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';

@Global()
@Module({
    imports: [
        ConfigModule,
        PassportModule.register({
            defaultStrategy: ['jwt', 'api-key'],
        }),
        UserModule,
        KeyModule,
        TypeOrmModule.forFeature([
            UserClientDTO,
        ]),
    ],
    providers: [
        ChannelKeyStrategy,
        ApiKeyStrategy,
        ClientKeyStrategy,
        JwtStrategy,
        AuthService,
    ],
    exports: [
        ChannelKeyStrategy,
        PassportModule,
        JwtStrategy,
        ApiKeyStrategy,
        ClientKeyStrategy,
        AuthService,
    ],
    controllers: [AuthController],
})
export class AuthModule {}
