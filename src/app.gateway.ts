import { Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Gateway } from 'src/app.interfaces';
import {
    Server,
    WebSocket,
} from 'ws';
import * as _ from 'lodash';
import { AuthService } from 'src/auth/auth.service';
import {
    parse,
    UrlWithStringQuery,
} from 'url';
import * as qs from 'qs';
import { IncomingMessage } from 'http';
import * as yup from 'yup';

interface WSConnectionConfig {
    roomId: string;
    eventId: string;
    broadcast: string | string[];
    authType: string;
    authToken: string;
}

type ClientMap = Record<string, Record<string, WebSocket[]>>;

@WebSocketGateway({ path: '/websocket' })
export class AppGateway implements Gateway {
    @WebSocketServer()
    public server: Server;
    private logger: Logger = new Logger('AppGateway');
    private wsConnectionConfigSchema = yup.object().shape({
        room: yup.string().min(1).required(),
        event: yup.string().min(1).required(),
        broadcast: yup.lazy((value) => {
            switch (typeof value) {
                case 'string': {
                    return yup.string().min(0).required();
                }
                case 'object': {
                    return yup.array(yup.string()).min(0).required();
                }
                default:
                    return yup.mixed().required();
            }
        }),
        auth_type: yup.string().min(1).required(),
        auth_token: yup.string().min(1).required(),
    });
    private clientMap: ClientMap = {};

    public constructor (
        private readonly authService: AuthService,
    ) {}

    public afterInit() {
        this.logger.log('WebSocket server initialized');
    }

    public handleConnection(socket: WebSocket, request: IncomingMessage) {
        let urlConfig: UrlWithStringQuery;

        try {
            const url = request?.url || '';
            this.logger.log(`Attempting connect: ${url}`);
            urlConfig = parse(url);
        } catch(e) {}

        if (!urlConfig || !urlConfig.search) {
            this.logger.log('WS connection config parse error, exiting...');
            socket.close();
            return;
        }

        const config = qs.parse(
            urlConfig.search.startsWith('?')
                ? urlConfig.search.slice(1)
                : urlConfig.search,
        ) as Record<string, string>;

        if (!this.wsConnectionConfigSchema.isValidSync(config)) {
            this.logger.log('WS connection config failed to pass check, original config: ' + JSON.stringify(config));
            socket.close();
            return;
        }

        const {
            room: roomId,
            event: eventId,
            broadcast,
            auth_type: authType,
            auth_token: authToken,
        } = config;

        _.merge(socket, {
            _pugioWSConnectionConfig: {
                roomId,
                eventId,
                broadcast,
                authType,
                authToken,
            } as WSConnectionConfig,
        });

        if (!_.isArray(_.get(this.clientMap, `${roomId}.${eventId}`))) {
            this.clientMap = _.set(this.clientMap, `${roomId}.${eventId}`, []);
        }

        this.clientMap[roomId][eventId].push(socket);

        this.authService.checkSocketGatewayPermission(authToken, authType)
            .then((userId) => {
                return this.authService.checkPermission({
                    userId,
                    clientId: roomId,
                }).then((valid) => ({ userId, valid }));
            })
            .then(({ valid, userId }) => {
                if (!valid) {
                    return Promise.reject(new Error(`User ${userId} has no permission to access client ${roomId}`));
                } else {
                    this.logger.log(`WS connection connected, room: ${roomId}, user: ${userId}, config: ${JSON.stringify(config)}`);
                }
            })
            .catch((error) => {
                this.logger.log(error.message || error.toString());
                socket.close();
            });

        socket.on('message', (data) => {
            this.sendMessage(roomId, broadcast, data);
        });
    }

    public handleDisconnect(socket: WebSocket) {
        const connectionConfig: WSConnectionConfig = _.get(socket, '_pugioWSConnectionConfig') || {};
        const {
            eventId,
            roomId,
        } = connectionConfig;
        this.clientMap = _.set(
            this.clientMap,
            `${roomId}.${eventId}`,
            (_.get(this.clientMap, `${roomId}.${eventId}` || [])).filter((currentSocket) => {
                return currentSocket !== socket;
            }),
        );
        this.logger.log(`Client disconnected: ${JSON.stringify(_.get(socket, '_pugioWSConnectionConfig'))}`);
    }

    public sendMessage(roomId: string, event: string | string[], data: any) {
        const broadcastEventIdList: string[] = typeof event === 'string'
            ? [event]
            : event;
        const sockets = broadcastEventIdList.reduce((result, broadcastEventId) => {
            return result.concat(_.get(this.clientMap, `${roomId}.${broadcastEventId}` || []));
        }, [] as WebSocket[]);

        sockets.forEach((targetSocket) => {
            targetSocket.send(data);
        });
    }
}
