import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Oauth2Module } from 'src/oauth2/oauth2.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports: [
        ConfigModule,
        Oauth2Module,
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
