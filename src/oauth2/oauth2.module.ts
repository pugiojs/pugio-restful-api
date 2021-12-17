import { Module } from '@nestjs/common';
import { Oauth2Service } from './oauth2.service';
import { Oauth2Controller } from './oauth2.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [Oauth2Service],
    controllers: [Oauth2Controller],
    exports: [Oauth2Service],
})
export class Oauth2Module {}
