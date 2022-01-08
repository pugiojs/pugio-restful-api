import { Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsResponse,
} from '@nestjs/websockets';
import { Observable } from 'rxjs';
import { Server } from 'ws';

@WebSocketGateway(5001)
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    private server: Server;

    private logger: Logger = new Logger('AppGateway');

    @SubscribeMessage('execute')
    public onEvent(client: any, data: any): Observable<WsResponse<number>> {
        this.server.clients.forEach((client) => client.send(data));
        return data;
    }

    public afterInit(server: Server) {
        this.logger.log('WebSocket server initialized');
    }

    public handleConnection(client, ...args: any[]) {
        this.logger.log('Client connected');
    }

    public handleDisconnect(client) {
        this.logger.log('Client disconnected');
    }
}
