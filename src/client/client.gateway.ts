import { Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Gateway } from 'src/app.interfaces';
import { Server } from 'ws';

@WebSocketGateway({
    path: '/api/v1/websocket/client',
})
export class ClientGateway implements Gateway {
    @WebSocketServer()
    public server: Server;

    private logger: Logger = new Logger('ClientGateway');

    public afterInit() {
        this.logger.log('WebSocket server initialized');
    }

    public handleConnection() {
        this.logger.log('Client connected');
    }

    public handleDisconnect() {
        this.logger.log('Client disconnected');
    }
}
