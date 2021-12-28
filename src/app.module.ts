import { Module } from '@nestjs/common';
import {
    ConfigModule,
    ConfigService,
} from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AppInterceptor } from './app.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { getMetadataArgsStorage } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilModule } from './util/util.module';
import { Auth0Module } from './auth0/auth0.module';
import { GroupModule } from './group/group.module';

// Application configs
import appConfig from './config/app.config';
import dbConfig from './config/db.config';
import authConfig from './config/auth.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [
                appConfig,
                dbConfig,
                authConfig,
            ],
        }),
        AuthModule,
        Auth0Module,
        UserModule,
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                return {
                    ...(config.get('db') as Record<string, any>),
                    entities: getMetadataArgsStorage().tables.map(
                        (table) => table.target,
                    ),
                    keepConnectionAlive: true,
                    synchronize: true,
                };
            },
            inject: [ConfigService],
        }),
        UtilModule,
        Auth0Module,
        GroupModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AppInterceptor,
        },
    ],
})
export class AppModule {}
