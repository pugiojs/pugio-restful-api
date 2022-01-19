import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
    FindConditions,
    ObjectLiteral,
    Repository,
} from 'typeorm';

export interface GatewayServer {
    server: Server;
}
export type Gateway =
    OnGatewayInit &
    OnGatewayConnection &
    OnGatewayDisconnect &
    GatewayServer;

export type WhereOptions<D> = FindConditions<D>[] | FindConditions<D> | ObjectLiteral | string;
export interface PaginationQueryOptions<D> {
    repository: Repository<D>;
    whereOptions?: WhereOptions<D>;
    lastCursor?: string;
    size?: number;
    searchKeys?: Array<keyof D | '@sys_nil@'>;
    searchContent?: string;
}

export interface PaginationResponse<D> {
    items: D[];
    total: number;
    lastCursor?: string;
    size?: number;
}
