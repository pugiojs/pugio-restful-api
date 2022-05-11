import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        allowedHeaders: '*',
        origin: '*',
    });
    const configService = app.get<ConfigService>(ConfigService);
    app.setGlobalPrefix('/api/v1');
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}

bootstrap();
