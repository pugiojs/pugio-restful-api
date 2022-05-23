import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'ws';
import {
    FindConditions,
    FindManyOptions,
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
    prefix?: string,
    lastCursor?: string;
    queryOptions?: FindManyOptions<D>;
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

export type NestedConditionList<D> = Array<TRangeMap<D> | NestedConditionList<D>>;

export interface ResourceBaseInterceptorOptions {
    sources?: string | string[];
    paths?: string | string[];
    type?: number | number [];
    checkDeviceId?: boolean;
}

export type PaginationQueryServiceOptions<D> = Omit<PaginationQueryOptions<D>, 'repository'>;
export type CustomPaginationQueryOptions<D> = Pick<PaginationQueryOptions<D>, 'queryOptions'>;

export interface MembershipRequestDataItem {
    userId: string;
    roleType: number;
}
