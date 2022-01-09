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

@WebSocketGateway({
    path: '/api/v1/websocket',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    public server: Server;

    private logger: Logger = new Logger('AppGateway');

    @SubscribeMessage('execution_result')
    public handleExecutionResult(client: any, data: any): Observable<WsResponse<number>> {
        this.server.clients.forEach((client) => {
            this.logger.log(`Send data: ${data}`);
            client.send(data);
        });
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
