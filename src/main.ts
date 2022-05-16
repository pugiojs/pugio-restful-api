import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        allowedHeaders: '*',
        origin: '*',
    });

    const configService = app.get<ConfigService>(ConfigService);
    app.setGlobalPrefix('/api/v1');
    app.useWebSocketAdapter(new WsAdapter(app));

    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}

bootstrap();
