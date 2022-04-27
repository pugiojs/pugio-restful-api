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

@WebSocketGateway({
    namespace: 'client',
})
export class ClientGateway implements Gateway {
    @WebSocketServer()
    public server: Server;

    private logger: Logger = new Logger('ClientGateway');

    public afterInit() {
        this.logger.log('Socket.io server initialized');
    }

    public handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        this.logger.log(`Client '${client.id}' authentication info: ` + JSON.stringify(client.handshake.headers.authorization));
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
