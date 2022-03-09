import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UtilService } from 'src/util/util.service';
import { Repository } from 'typeorm';
import { ChannelDTO } from './dto/channel.dto';
import * as _ from 'lodash';
import { UserDTO } from 'src/user/dto/user.dto';
import { v5 as uuidv5 } from 'uuid';
import { ClientDTO } from 'src/client/dto/client.dto';
import { RequestService } from '@pugio/request';
import * as Crypto from 'crypto-js';
import { Method } from 'axios';

@Injectable()
export class ChannelService {
    private requestService: RequestService = new RequestService();

    public constructor(
        private readonly utilService: UtilService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(ChannelDTO)
        private readonly channelRepository: Repository<ChannelDTO>,
        @InjectRepository(ChannelClientDTO)
        private readonly channelClientRepository: Repository<ChannelClientDTO>,
    ) {
        this.requestService.initialize({
            transformCase: true,
        });
    }

    public async queryChannels(creatorId: string, options: PaginationQueryServiceOptions<ChannelDTO> = {}) {
        const result = await this.utilService.queryWithPagination<ChannelDTO>({
            queryOptions: {
                where: {
                    builtIn: false,
                    ...(
                        creatorId
                            ? {
                                creator: {
                                    id: creatorId,
                                },
                            }
                            : {}
                    ),
                },
                relations: ['creator'],
            },
            searchKeys: ['name', 'id', 'description', 'packageName'] as any[],
            repository: this.channelRepository,
            ...options,
        });

        return result;
    }

    public async queryClientChannels(
        clientId: string,
        options: PaginationQueryServiceOptions<ChannelClientDTO | ChannelDTO> & { builtIn?: boolean } = {},
    ) {
        const {
            builtIn = false,
            ...otherOptions
        } = options;

        let result;

        if (!builtIn) {
            result = await this.utilService.queryWithPagination<ChannelClientDTO>({
                queryOptions: {
                    where: {
                        client: {
                            id: clientId,
                        },
                    },
                    relations: ['client', 'channel'],
                },
                repository: this.channelClientRepository,
                searchKeys: [
                    'channel.name',
                    'channel.id',
                    'channel.description',
                    'channel.packageName',
                ] as any[],
                ...otherOptions,
            });
            result.items = result.items.map((item) => _.omit(item, ['client']));
        } else {
            const client = await this.clientRepository.findOne({
                where: {
                    id: clientId,
                },
            });

            result = await this.utilService.queryWithPagination<ChannelDTO>({
                queryOptions: {
                    where: {
                        builtIn: true,
                    },
                },
                repository: this.channelRepository,
                searchKeys: [
                    'name',
                    'id',
                    'description',
                    'packageName',
                ] as any[],
                ...otherOptions,
            });

            result.items = result.items.map((item) => {
                return {
                    id: item.id,
                    createdAt: client.createdAt,
                    updatedAt: client.updatedAt,
                    channel: item,
                };
            });
        }

        return result;
    }

    public async getChannelInfo(channelId: string) {
        const result = await this.channelRepository.findOne({
            where: {
                id: channelId,
            },
            select: [
                'name',
                'description',
                'avatar',
                'packageName',
                'registry',
                'bundleUrl',
                'key',
                'createdAt',
                'updatedAt',
            ],
        });

        if (!result) {
            throw new NotFoundException();
        }

        return result;
    }

    public async createChannel(creator: UserDTO, data: Partial<ChannelDTO>) {
        const key = uuidv5(new Date().toISOString(), creator.id);

        const channel = await this.channelRepository.save(
            this.channelRepository.create({
                ..._.pick(data, [
                    'name',
                    'description',
                    'avatar',
                    'packageName',
                    'registry',
                    'bundleUrl',
                ]),
                key,
                creator,
            }),
        );

        return _.omit(channel, ['creator', 'key']);
    }

    public async updateChannel(updater: UserDTO, channelId: string, data: Partial<ChannelDTO>) {
        const channel = await this.channelRepository.findOne({
            where: {
                id: channelId,
            },
            relations: ['creator'],
        });

        if (!channel) {
            throw new NotFoundException();
        }

        if (channel.creator.id !== updater.id) {
            throw new ForbiddenException();
        }

        const updates = _.pick(data, [
            'name',
            'description',
            'avatar',
            'registry',
            'bundleUrl',
        ]);

        return await this.channelRepository.save(
            _.merge(_.omit(channel, ['creator']), updates),
        );
    }

    public async addChannelToClient(clientId: string, channelId: string) {
        if (!_.isString(clientId) || !_.isString(channelId)) {
            throw new BadRequestException();
        }

        const existedRelation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            },
            relations: ['client', 'channel'],
        });

        if (existedRelation) {
            return _.omit(existedRelation, ['client', 'channel']);
        }

        const result = await this.channelClientRepository.save(
            this.channelClientRepository.create({
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            }),
        );

        return _.omit(result, ['client', 'channel']);
    }

    public async removeChannelFromClient(clientId: string, channelId: string) {
        if (!_.isString(clientId) || !_.isString(channelId)) {
            throw new BadRequestException();
        }

        const relation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            },
            relations: ['client', 'channel'],
        });

        if (!relation) {
            throw new NotFoundException();
        }

        await this.channelClientRepository.delete(relation.id);

        return _.omit(relation, ['client', 'channel']);
    }

    public async getChannelClientRelation(channelId: string, clientId: string) {
        if (!_.isString(clientId) || !_.isString(channelId)) {
            throw new BadRequestException();
        }

        const relation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            },
            relations: ['client', 'channel'],
        });

        if (!relation) {
            throw new NotFoundException();
        }

        return relation;
    }

    public async requestChannelApi(
        {
            clientId,
            channelId,
            pathname = '/',
            method = 'get',
            data = {},
            query = {},
        }: {
            clientId: string,
            channelId: string,
            pathname?: string,
            method?: Method,
            data?: Record<string, any>,
            query?: Record<string, any>,
        },
    ): Promise<any> {
        const relation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            },
            relations: ['client', 'channel'],
        });

        if (!relation) {
            return new ForbiddenException();
        }

        const {
            apiPrefix,
            key: channelAesKey,
        } = await this.channelRepository.findOne({
            where: {
                id: channelId,
            },
            select: ['id', 'apiPrefix', 'key'],
        });

        if (!apiPrefix) {
            throw new BadRequestException();
        }

        const context = Crypto
            .AES
            .encrypt(JSON.stringify(relation), channelAesKey)
            .toString();

        return await this.requestService
            .getInstance({
                headers: {
                    'X-Pugio-Context': context,
                },
            })
            .request({
                url: pathname,
                method,
                data,
                query,
            });
    }
}
