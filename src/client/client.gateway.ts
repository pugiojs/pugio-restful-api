import {
    forwardRef,
    Inject,
    Logger,
} from '@nestjs/common';
import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Gateway } from 'src/app.interfaces';
import {
    Server,
    Socket,
} from 'socket.io';
import * as _ from 'lodash';
import { ClientService } from './client.service';
import { AuthService } from 'src/auth/auth.service';
import { parse } from 'url';
import * as qs from 'qs';

@WebSocketGateway({
    namespace: 'client',
    cors: {
        credentials: true,
        methods: ['*'],
        origin: ['*'],
    },
})
export class ClientGateway implements Gateway {
    @WebSocketServer()
    public server: Server;
    private logger: Logger = new Logger('ClientGateway');

    public constructor (
        @Inject(forwardRef(() => ClientService))
        private readonly clientService: ClientService,
        private readonly authService: AuthService,
    ) {}

    public afterInit() {
        this.logger.log('Socket.io server initialized');
    }

    public handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    public handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

	@SubscribeMessage('join')
    public handleJoinRoom(client: Socket, roomId: string) {
        const query = (qs.parse(parse(client?.request?.url).query || '') || {}) as Record<string, string>;
        const {
            auth_type: type = '',
            auth_token: token = '',
        } = query;

        this.authService.checkSocketGatewayPermission(token, type).then((userId) => {
            return this.clientService.checkPermission({
                userId,
                clientId: roomId,
            });
        })
            .then((valid) => {
                if (valid) {
                    client.join(roomId);
                    this.logger.log('Client ' + client.id + ' joined room: ' + roomId);
                } else {
                    return Promise.reject(new Error());
                }
            })
            .catch(() => {
                this.logger.log('User permission validation failed, socket: ' + client.id + ', room: ' + roomId);
                client.disconnect();
            });
    }

	@SubscribeMessage('leave')
	public handleLeftRoom(client: Socket, roomId: string) {
	    client.leave(roomId);
	}

    @SubscribeMessage('channel_stream')
	public handleChannelStream(client: Socket, data: any) {
	    const {
	        eventId,
	        roomId,
	        data: content,
	    } = data;

	    this.server.to(roomId).emit(eventId, content);
	}
}
