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

export type TRangeItem = number | string | Date;
export type TRangeMap<D> = Partial<Record<keyof D, TRangeItem[]>>;
export type TRange<D> = TRangeMap<D> | TRangeMap<D>[];

export type WhereOptions<D> = FindConditions<D>[] | FindConditions<D> | ObjectLiteral | string;

export interface PaginationQueryOptions<D> {
    repository: Repository<D>;
    lastCursor?: string;
    whereOptions?: WhereOptions<D>;
    size?: number;
    searchKeys?: Array<keyof D | '@sys_nil@'>;
    searchContent?: string;
    range?: TRange<D>;
}

export interface PaginationQueryResponse<D> {
    items: D[];
    remains: number;
    size?: number;
    lastCursor?: string;
    timestamp?: Date;
}
