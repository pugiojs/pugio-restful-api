import { Logger } from '@nestjs/common';
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
import { KeyService } from 'src/key/key.service';

@WebSocketGateway({
    namespace: 'client',
})
export class ClientGateway implements Gateway {
    @WebSocketServer()
    public server: Server;
    private logger: Logger = new Logger('ClientGateway');

    public constructor (
        private readonly keyService: KeyService,
    ) {}

    public afterInit() {
        this.logger.log('Socket.io server initialized');
    }

    public handleConnection(client: Socket) {
        const tokenInfo = _.get(client.handshake, 'headers.authorization') as string;

        this.logger.log(`Client connected: ${client.id}`);

        if (!tokenInfo) {
            this.logger.log(`Token for client ${client.id} not found, exiting...`);
            client.disconnect();
        }

        this.logger.log(`Client '${client.id}' authentication token: ` + tokenInfo);

        const [type, token] = tokenInfo.split(/\s+/g);

        switch (type.toLowerCase()) {
            case 'ak': {
                this.keyService.validateApiKey(token, ['socket'], 'all').then((res) => {
                    if (!res) {
                        this.logger.log(`Client '${client.id}' authentication via AK failed, exiting...`);
                        client.disconnect();
                    }
                });
                break;
            }
            case 'ck': {
                this.keyService.validateClientKey(token).then((res) => {
                    if (!res?.user) {
                        this.logger.log(`Client '${client.id}' authentication via CK failed, exiting...`);
                        client.disconnect();
                    }
                });
                break;
            }
            default: {
                this.logger.log(`Cannot parse type '${type}' from client '${client.id}'`);
                client.disconnect();
                break;
            }
        }
    }

    public handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

	@SubscribeMessage('join')
    public handleJoinRoom(client: Socket, roomId: string) {
        client.join(roomId);
        this.logger.log(`Client joined: ${roomId}`);
    }

	@SubscribeMessage('leave')
	public handleLeftRoom(client: Socket, roomId: string) {
	    client.leave(roomId);
	}
}
