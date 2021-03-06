import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    PaginationQueryOptions,
    PaginationQueryServiceOptions,
} from 'src/app.interfaces';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UtilService } from 'src/util/util.service';
import {
    In,
    Repository,
} from 'typeorm';
import { ChannelDTO } from './dto/channel.dto';
import * as _ from 'lodash';
import { UserDTO } from 'src/user/dto/user.dto';
import { v5 as uuidv5 } from 'uuid';
import { ClientDTO } from 'src/client/dto/client.dto';
import { RequestService } from '@pugio/request';
import * as Crypto from 'crypto-js';
import { Method } from 'axios';
import { UserClientDTO } from 'src/relations/user-client.dto';

@Injectable()
export class ChannelService {
    private requestService: RequestService = new RequestService();

    public constructor(
        private readonly utilService: UtilService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(ChannelDTO)
        private readonly channelRepository: Repository<ChannelDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
        @InjectRepository(ChannelClientDTO)
        private readonly channelClientRepository: Repository<ChannelClientDTO>,
    ) {
        this.requestService.initialize(
            {
                transformCase: true,
            },
            (instance) => {
                const defaultRequestTransformers = instance.defaults.transformRequest || [];

                instance.defaults.transformRequest = [
                    (data) => {
                        return this.utilService.transformDTOToDAO(data);
                    },
                    ...(
                        _.isArray(defaultRequestTransformers)
                            ? defaultRequestTransformers
                            : [defaultRequestTransformers]
                    ),
                ];

                instance.interceptors.response.use((response) => {
                    const responseStatus = response.status;
                    const responseContent = response.data;
                    const data = {
                        response: null,
                        error: null,
                    };

                    if (responseStatus >= 400) {
                        data.error = responseContent;
                    } else {
                        data.response = responseContent;
                    }

                    return data;
                });
            },
        );
    }

    public async queryChannels(user: UserDTO, creatorId: string, options: PaginationQueryServiceOptions<ChannelDTO> = {}) {
        let status = _.get(options, 'queryOptions.where.status');

        if (!_.isNumber(status)) {
            status = 1;
        }

        const result = await this.utilService.queryWithPagination<ChannelDTO>(
            _.merge<
                PaginationQueryOptions<ChannelDTO>,
                PaginationQueryServiceOptions<ChannelDTO>,
                PaginationQueryServiceOptions<ChannelDTO>,
                PaginationQueryServiceOptions<ChannelDTO>
            >(
                {
                    queryOptions: {
                        where: {
                            builtIn: false,
                        },
                        relations: ['creator'],
                    },
                    searchKeys: ['name', 'id', 'description', 'packageName'] as any[],
                    repository: this.channelRepository,
                },
                _.omit(options, 'queryOptions'),
                creatorId
                    ? {
                        queryOptions: {
                            where: {
                                creator: {
                                    id: creatorId,
                                },
                            },
                        },
                    }
                    : {},
                {
                    queryOptions: {
                        where: {
                            status: (status !== 1 && user.id !== creatorId) ? -1 : status,
                        },
                    },
                },
            ),
        );

        return result;
    }

    public async queryClientChannels(
        clientId: string,
        options: PaginationQueryServiceOptions<ChannelClientDTO | ChannelDTO> & { builtIn?: boolean, status?: number } = {},
    ) {
        const {
            builtIn = false,
            status,
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
                        ...(
                            _.isNumber(status)
                                ? {
                                    channel: {
                                        status,
                                    },
                                }
                                : {}
                        ),
                    },
                    relations: ['client', 'channel', 'channel.creator'],
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
                        ...(
                            _.isNumber(status)
                                ? {
                                    status,
                                }
                                : {}
                        ),
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

    public async getChannelInfo(user: UserDTO, channelId: string) {
        const result = await this.channelRepository.findOne({
            where: {
                id: channelId,
            },
            select: [
                'id',
                'name',
                'description',
                'avatar',
                'packageName',
                'registry',
                'bundleUrl',
                'key',
                'localeMap',
                'nameTranslation',
                'createdAt',
                'updatedAt',
            ],
            relations: ['creator'],
        });

        if (!result) {
            throw new NotFoundException();
        }

        if (result?.creator?.id === user.id) {
            return result;
        }

        return _.omit(result, ['key']);
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
                    'localeMap',
                    'nameTranslation',
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
            'localeMap',
            'nameTranslation',
        ]);

        return await this.channelRepository.save(
            _.merge(_.omit(channel, ['creator']), updates),
        );
    }

    public async addChannelToClients(user: UserDTO, clientIdList: string | string[], channelId: string) {
        if ((!_.isString(clientIdList) && !_.isArray(clientIdList)) || !_.isString(channelId)) {
            throw new BadRequestException();
        }

        const targetClientIdList = _.isString(clientIdList)
            ? [clientIdList]
            : clientIdList;

        const channelClientCreationPromiseList = targetClientIdList.map(async (clientId) => {
            const currentUserClientRelation = await this.userClientRepository.findOne({
                where: {
                    user: {
                        id: user.id,
                    },
                    client: {
                        id: clientId,
                    },
                    roleType: In([0, 1]),
                },
            });

            if (!currentUserClientRelation) {
                return null;
            }

            const existedChannelClientRelation = await this.channelClientRepository.findOne({
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

            if (existedChannelClientRelation) {
                return existedChannelClientRelation;
            }

            try {
                return await this.channelClientRepository.save(
                    this.channelClientRepository.create({
                        client: {
                            id: clientId,
                        },
                        channel: {
                            id: channelId,
                        },
                    }),
                );
            } catch (e) {
                return null;
            }
        });

        const result = await Promise.all(channelClientCreationPromiseList);

        return result.filter((resultItem) => resultItem !== null);
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

    public async getChannelClientRelation(channelId: string, clientId: string, client?: ClientDTO) {
        const currentClientId = client ? client.id : clientId;

        if (!_.isString(currentClientId) || !_.isString(channelId)) {
            throw new BadRequestException();
        }

        const relation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: currentClientId,
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
            client,
            user,
            clientId,
            channelId,
            pathname = '/',
            method = 'get',
            data = {},
            query = {},
        }: {
            user: UserDTO,
            channelId: string,
            client?: ClientDTO,
            clientId?: string,
            pathname?: string,
            method?: Method,
            data?: Record<string, any>,
            query?: Record<string, any>,
        },
    ): Promise<any> {
        const targetClientId = client ? client.id : clientId;

        const relation = await this.userClientRepository.findOne({
            where: {
                client: {
                    id: targetClientId,
                },
                user: {
                    id: user.id,
                },
            },
            relations: ['client', 'user'],
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

        const result = await this.requestService
            .getInstance({
                baseURL: apiPrefix,
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

        return result;
    }
}
