import {
    Logger,
    Module,
} from '@nestjs/common';
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
import { GroupModule } from './group/group.module';
import { KeyModule } from './key/key.module';
import { ApplicationModule } from './application/application.module';
import { AccountModule } from './account/account.module';
import { EventModule } from './event/event.module';
import { ClientModule } from './client/client.module';
import { RedisModule } from 'nestjs-redis';

// Application configs
import appConfig from './config/app.config';
import dbConfig from './config/db.config';
import authConfig from './config/auth.config';
import redisConfig from './config/redis.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [
                appConfig,
                dbConfig,
                authConfig,
                redisConfig,
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
                    entityPrefix: 'pb__',
                };
            },
            inject: [ConfigService],
        }),
        UtilModule,
        GroupModule,
        KeyModule,
        ApplicationModule,
        AccountModule,
        EventModule,
        ClientModule,
        RedisModule.forRootAsync({
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('RedisClient');

                return {
                    ...configService.get('redis'),
                    onClientReady: () => {
                        logger.log('Redis client ready');
                    },
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
