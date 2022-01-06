import {
    Logger,
} from '@nestjs/common';
import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import {
    Server,
    Socket,
} from 'socket.io';

@WebSocketGateway({ namespace: 'app' })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private logger: Logger = new Logger('AppGateway');

    @SubscribeMessage('message')
    public handleMessage(client: any, payload: any): string {
        this.logger.log(client, payload);
        return 'Hello world!';
    }

    public afterInit(server: Server) {
        this.logger.log('Socket.io server initialized');
    }

    public handleConnection(client: Socket, ...args: any[]) {
        this.logger.log('Client connected:', client.id);
    }

    public handleDisconnect(client: Socket) {
        this.logger.log('Client disconnected:', client.id);
    }
}
