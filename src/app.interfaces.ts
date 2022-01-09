import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'ws';

export interface GatewayServer {
    server: Server;
}
export type Gateway =
    OnGatewayInit &
    OnGatewayConnection &
    OnGatewayDisconnect &
    GatewayServer;
