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

// Application configs
import appConfig from './config/app.config';
import dbConfig from './config/db.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [
                appConfig,
                dbConfig,
            ],
        }),
        AuthModule,
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
