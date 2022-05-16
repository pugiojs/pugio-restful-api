import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { Server as WebSocketServer } from 'ws';
import { AuthService } from './auth/auth.service';
import {
    parse,
    UrlWithStringQuery,
} from 'url';
import { Logger } from '@nestjs/common';
import * as qs from 'qs';
import * as yup from 'yup';
import * as _ from 'lodash';
import { ClientService } from './client/client.service';

interface WSConnectionConfig {
    roomId: string;
    eventId: string;
    broadcast: string | string[];
    authType: string;
    authToken: string;
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        allowedHeaders: '*',
        origin: '*',
    });

    const configService = app.get<ConfigService>(ConfigService);
    const authService = app.get<AuthService>(AuthService);
    const clientService = app.get<ClientService>(ClientService);

    app.setGlobalPrefix('/api/v1');
    app.useWebSocketAdapter(new WsAdapter(app));

    // const logger = new Logger('WebSocket Server');
    // const wsConnectionConfigSchema = yup.object().shape({
    //     room: yup.string().min(1).required(),
    //     event: yup.string().min(1).required(),
    //     broadcast: yup.lazy((value) => {
    //         switch (typeof value) {
    //             case 'string': {
    //                 return yup.string().min(1).required();
    //             }
    //             case 'object': {
    //                 return yup.array(yup.string()).min(1).required();
    //             }
    //             default:
    //                 return yup.mixed().required();
    //         }
    //     }),
    //     auth_type: yup.string().min(1).required(),
    //     auth_token: yup.string().min(1).required(),
    // });
    // const wss = new WebSocketServer({
    //     server: app.getHttpServer(),
    // });

    // wss.on('connection', (socket, request) => {
    //     let urlConfig: UrlWithStringQuery;

    //     try {
    //         const url = request?.url || '';
    //         logger.log(`Attempting connect: ${url}`);
    //         urlConfig = parse(url);
    //     } catch(e) {}

    //     if (!urlConfig || !urlConfig.search) {
    //         logger.log('WS connection config parse error, exiting...');
    //         socket.close();
    //         return;
    //     }

    //     if (urlConfig.pathname !== '/websocket') {
    //         return;
    //     }

    //     const config = qs.parse(
    //         urlConfig.search.startsWith('?')
    //             ? urlConfig.search.slice(1)
    //             : urlConfig.search,
    //     ) as Record<string, string>;

    //     if (!wsConnectionConfigSchema.isValidSync(config)) {
    //         logger.log('WS connection config failed to pass check, original config: ' + JSON.stringify(config));
    //         socket.close();
    //         return;
    //     }

    //     const {
    //         room: roomId,
    //         event: eventId,
    //         broadcast,
    //         auth_type: authType,
    //         auth_token: authToken,
    //     } = config;

    //     _.merge(socket, {
    //         _pugioWSConnectionConfig: {
    //             roomId,
    //             eventId,
    //             broadcast,
    //             authType,
    //             authToken,
    //         } as WSConnectionConfig,
    //     });

    //     const broadcastEventIdList = typeof broadcast === 'string'
    //         ? [broadcast]
    //         : broadcast;

    //     authService.checkSocketGatewayPermission(authToken, authType)
    //         .then((userId) => {
    //             return clientService.checkPermission({
    //                 userId,
    //                 clientId: roomId,
    //             }).then((valid) => ({ userId, valid }));
    //         })
    //         .then(({ valid, userId }) => {
    //             if (!valid) {
    //                 return Promise.reject(new Error(`User ${userId} has no permission to access client ${roomId}`));
    //             } else {
    //                 logger.log(`WS connection connected, room: ${roomId}, user: ${userId}, config: ${JSON.stringify(config)}`);
    //             }
    //         })
    //         .catch((error) => {
    //             logger.log(error.message || error.toString());
    //             socket.close();
    //         });

    //     socket.on('message', (data) => {
    //         wss.clients.forEach((targetSocket) => {
    //             const connectionConfig = _.get(targetSocket, '_pugioWSConnectionConfig') as WSConnectionConfig;

    //             if (
    //                 targetSocket !== socket &&
    //                 connectionConfig?.roomId === roomId &&
    //                 broadcastEventIdList.indexOf(connectionConfig?.eventId) !== -1
    //             ) {
    //                 targetSocket.send(data);
    //             }
    //         });
    //     });
    // });

    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}

bootstrap();
