import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WebSocketServer } from 'ws';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get<ConfigService>(ConfigService);
    app.setGlobalPrefix('/api/v1');

    const wss = new WebSocketServer({
        port: configService.get<number>('app.port'),
        perMessageDeflate: {
            zlibDeflateOptions: {
                // See zlib defaults.
                chunkSize: 1024,
                memLevel: 7,
                level: 3,
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024,
            },
            // Other options settable:
            clientNoContextTakeover: true, // Defaults to negotiated value.
            serverNoContextTakeover: true, // Defaults to negotiated value.
            serverMaxWindowBits: 10, // Defaults to negotiated value.
            // Below options specified as default values.
            concurrencyLimit: 10, // Limits zlib concurrency for perf.
            threshold: 1024, // Size (in bytes) below which messages
            // should not be compressed if context takeover is disabled.
        },
    });

    wss.on('connection', (socket) => console.log(socket));

    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}

bootstrap();
