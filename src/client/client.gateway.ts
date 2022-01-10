import { Logger } from '@nestjs/common';
import {
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
    }

    public handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
}