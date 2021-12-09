import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get<ConfigService>(ConfigService);
    const appService = app.get<AppService>(AppService);
    await appService.createKeyPair();
    app.setGlobalPrefix('/api/v1');
    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}
bootstrap();
