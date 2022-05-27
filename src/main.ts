import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as bodyParser from 'body-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        allowedHeaders: '*',
        origin: '*',
    });
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded( {limit: '50mb', extended: true }));

    const configService = app.get<ConfigService>(ConfigService);
    app.setGlobalPrefix('/api/v1');
    app.useWebSocketAdapter(new WsAdapter(app));

    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}

bootstrap();
