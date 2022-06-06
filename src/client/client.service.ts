import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { UtilService } from 'src/util/util.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
    In,
    Not,
    Repository,
} from 'typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientDTO } from './dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import * as _ from 'lodash';
import {
    MembershipRequestDataItem,
    PaginationQueryServiceOptions,
} from 'src/app.interfaces';
import { ERR_CLIENT_REQUEST_TIMED_OUT } from 'src/app.constants';
import { v5 as uuidv5 } from 'uuid';
import * as EventEmitter from 'events';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { ChannelDTO } from 'src/channel/dto/channel.dto';
import { AppGateway } from 'src/app.gateway';

@Injectable()
export class ClientService {
    private redisClient: Redis;
    private emitter: EventEmitter;

    public constructor(
        private readonly utilService: UtilService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
        @InjectRepository(ChannelClientDTO)
        private readonly channelClientRepository: Repository<ChannelClientDTO>,
        private readonly redisService: RedisService,
        private readonly appGateway: AppGateway,
    ) {
        this.redisClient = this.redisService.getClient();
        this.emitter = new EventEmitter();
    }

    public async createClient(user: UserDTO, configuration: Partial<ClientDTO>) {
        const {
            name,
            description,
            deviceId,
            publicKey,
            privateKey,
        } = configuration;

        const client = await this.clientRepository.save(
            this.clientRepository.create({
                name,
                description,
                deviceId,
                publicKey,
                privateKey,
            }),
        );

        const userClientRelationship = this.userClientRepository.create({
            user,
            client,
            roleType: 0,
        });

        await this.userClientRepository.save(userClientRelationship);

        return client;
    }

    public async getClientInfoFromNetwork(clientId: string, user: UserDTO) {
        const userClientRelationshipList = await this.userClientRepository.find({
            where: {
                client: {
                    id: clientId,
                },
            },
            relations: ['user', 'client'],
        });

        if (userClientRelationshipList.length === 0) {
            throw new NotFoundException();
        }

        const result = userClientRelationshipList.find((relationship) => {
            return relationship.user.id === user.id;
        });

        if (!result) {
            throw new ForbiddenException();
        }

        const clientInfo = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
            select: [
                'id',
                'name',
                'description',
                'deviceId',
                'verified',
                'version',
                'createdAt',
                'updatedAt',
                ...(
                    result.roleType <= 1
                        ? [
                            'publicKey',
                            'privateKey',
                        ] as Array<keyof ClientDTO>
                        : []
                ),
            ],
        });

        return clientInfo;
    }

    public async handleMakeChallenge(client: ClientDTO, deviceId: string, version = '1.0.0') {
        if (!client || !_.isString(deviceId)) {
            throw new BadRequestException();
        }

        const clientId = client.id;

        const {
            deviceId: clientDeviceId,
        } = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
            select: ['deviceId', 'id'],
        });

        await this.clientRepository.update(
            {
                id: clientId,
            },
            {
                deviceId,
                verified: clientDeviceId === deviceId,
                version,
            },
        );

        const credential = await this.utilService.generateRandomPassword(clientId);

        await this.redisClient.aclSetUser(
            clientId,
            [
                'on',
                '>' + credential,
                'resetchannels',
                '~' + clientId + ':*',
                '-@all',
                '+@pubsub',
            ],
        );
        await this.redisClient.aclSetUser(clientId, ['&' + clientId + '@*']);

        const newClientInfo = await this.redisClient.aclGetUser(clientId);

        const channels = [
            'execution',
            'file',
            'os',
        ];

        return {
            credential,
            channels: channels.map((channel) => this.utilService.generateChannelName(clientId, channel)),
            clientInfo: _.omit(newClientInfo, 'passwords'),
        };
    }

    public async handleChannelConnection(client: ClientDTO, oldCredential: string) {
        if (!(client) || !_.isString(oldCredential)) {
            throw new BadRequestException();
        }

        const clientId = client.id;
        let clientInfo;

        try {
            clientInfo = await this.redisClient.aclGetUser(clientId);
        } catch (e) {}

        if (clientInfo) {
            await this.redisClient.aclSetUser(
                clientId,
                ['<' + oldCredential],
            );
        }

        await this.redisClient.aclSetUser(clientId, ['off']);

        const newClientInfo = await this.redisClient.aclGetUser(clientId);

        return {
            clientInfo: _.omit(newClientInfo, 'passwords'),
        };
    }

    public async queryClients(
        user: UserDTO,
        roles: number[] = [],
        options: PaginationQueryServiceOptions<UserClientDTO> = {},
    ) {
        const result = await this.utilService.queryWithPagination<UserClientDTO>({
            queryOptions: {
                where: {
                    user: {
                        id: user.id,
                    },
                    ...(
                        roles.length > 0
                            ? {
                                roleType: In(roles),
                            }
                            : {}
                    ),
                },
                select: ['id', 'client', 'roleType', 'createdAt', 'updatedAt'],
                relations: ['user', 'client'],
            },
            searchKeys: ['client.name', 'client.description'] as any[],
            repository: this.userClientRepository,
            ...options,
        });

        return {
            ...result,
            items: result.items.map((result) => _.omit(result, 'user')),
        };
    }

    public async queryClientMemberships(
        user: UserDTO,
        clientId: string,
        roles: number[],
        options: PaginationQueryServiceOptions<UserClientDTO> = {},
    ) {
        const result = await this.utilService.queryWithPagination<UserClientDTO>({
            queryOptions: {
                where: {
                    client: {
                        id: clientId,
                    },
                    user: {
                        id: Not(user.id),
                    },
                    ...(
                        roles.length > 0
                            ? {
                                roleType: In(roles),
                            }
                            : {}
                    ),
                },
                select: ['id', 'user', 'client', 'roleType', 'createdAt', 'updatedAt'],
                relations: ['user', 'client'],
            },
            searchKeys: [
                'user.id',
                'user.openId',
                'user.email',
                'user.fullName',
                'user.firstName',
                'user.middleName',
                'user.lastName',
            ] as any[],
            repository: this.userClientRepository,
            ...options,
        });

        return {
            ...result,
            items: result.items.map((result) => _.omit(result, 'client')),
        };
    }

    public async handleCreateMembership(
        user: UserDTO,
        clientId: string,
        memberships: MembershipRequestDataItem[],
    ) {
        let resultList = [];

        const currentUserMembership = await this.userClientRepository.findOne({
            where: {
                user: {
                    id: user.id,
                },
                client: {
                    id: clientId,
                },
            },
        });

        const existedMemberships = await this.userClientRepository.find({
            where: {
                user: {
                    id: In(memberships.map((membership) => membership.userId)),
                },
                client: {
                    id: clientId,
                },
                roleType: Not(0),
            },
            relations: ['user', 'client'],
            select: ['user', 'client', 'id', 'roleType'],
        });

        const newMemberships: MembershipRequestDataItem[] = [];
        const ownerMemberships: MembershipRequestDataItem[] = [];
        const updateMemberships: MembershipRequestDataItem[] = [];

        for (const membership of memberships) {
            if (membership.roleType < currentUserMembership.roleType) {
                continue;
            }

            if (
                membership.roleType !== 0 &&
                existedMemberships.find((existedMembership) => {
                    return membership.userId === existedMembership.user.id;
                })
            ) {
                updateMemberships.push(membership);
                continue;
            }

            if (membership.roleType === 0) {
                ownerMemberships.push(membership);
                continue;
            }

            if (
                membership.roleType !== 0 &&
                await this.userClientRepository.findOne({
                    where: {
                        user: {
                            id: membership.userId,
                        },
                        client: {
                            id: clientId,
                        },
                        roleType: 0,
                    },
                    relations: ['user', 'client'],
                })
            ) {
                continue;
            }

            newMemberships.push(membership);
        }


        /**
         * create ownership
         */
        if (ownerMemberships.length > 0) {
            try {
                await this.userClientRepository.delete({
                    id: currentUserMembership.id,
                });
            } catch (e) {}

            const legacyOwnerShip = await this.userClientRepository.findOne({
                where: {
                    client: {
                        id: clientId,
                    },
                    roleType: 0,
                },
            });

            if (!legacyOwnerShip) {
                const legacyMembership = await this.userClientRepository.findOne({
                    where: {
                        user: {
                            id: ownerMemberships[0].userId,
                        },
                        client: {
                            id: clientId,
                        },
                    },
                    relations: ['user', 'client'],
                });

                if (legacyMembership) {
                    await this.userClientRepository.delete({
                        id: legacyMembership.id,
                    });
                }

                const result = await this.userClientRepository.save(
                    this.userClientRepository.create({
                        user: {
                            id: ownerMemberships[0].userId,
                        },
                        client: {
                            id: clientId,
                        },
                        roleType: 0,
                    }),
                );

                resultList.push(result);
            }
        }

        if (newMemberships.length > 0) {
            const currentResults = await this.userClientRepository.save(
                newMemberships.map((membership) => {
                    return this.userClientRepository.create({
                        user: {
                            id: membership.userId,
                        },
                        client: {
                            id: clientId,
                        },
                        roleType: membership.roleType,
                    });
                }),
            );

            resultList = resultList.concat(currentResults);
        }

        if (updateMemberships.length > 0) {
            const currentResults = await this.userClientRepository.save(
                updateMemberships.map((updateMembership) => {
                    const legacyOwnerShip = existedMemberships.find((existedMembership) => {
                        return existedMembership.user.id === updateMembership.userId;
                    });

                    if (!legacyOwnerShip) {
                        return null;
                    }

                    return this.userClientRepository.create({
                        id: legacyOwnerShip.id,
                        roleType: updateMembership.roleType,
                        user: {
                            id: updateMembership.userId,
                        },
                        client: {
                            id: clientId,
                        },
                    });
                }).filter((updateMembership) => !!updateMembership),
            );

            resultList = resultList.concat(currentResults);
        }

        return resultList;
    }

    public async handleDeleteMemberRelationship(
        user: UserDTO,
        clientId: string,
        targetUserIdOrList?: string | string[],
    ) {
        if (!targetUserIdOrList) {
            return [];
        }

        const targetUserIdList = _.isArray(targetUserIdOrList)
            ? Array.from(targetUserIdOrList)
            : [targetUserIdOrList];

        const currentRelationship = await this.userClientRepository.findOne({
            where: {
                user: {
                    id: user.id,
                },
                client: {
                    id: clientId,
                },
            },
        });

        const targetRelations = await this.userClientRepository.find({
            where: {
                user: {
                    id: In(targetUserIdList),
                },
                client: {
                    id: clientId,
                },
            },
            relations: ['user', 'client'],
        });

        if (
            targetRelations.some((relation) => {
                return (
                    relation.user.id !== user.id &&
                    relation.roleType <= currentRelationship.roleType
                );
            })
        ) {
            throw new ForbiddenException();
        }

        if (targetRelations.length === 0) {
            return [];
        }

        await this.userClientRepository.delete({
            id: In(targetRelations.map((relation) => relation.id)),
        });

        return targetRelations;
    }

    public async updateClient(clientId: string, updates: Partial<ClientDTO>) {
        const updateData = _.pick(
            updates,
            [
                'name',
                'description',
                'deviceId',
                'publicKey',
                'privateKey',
            ],
        );

        const client = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
        });

        if (!client) {
            throw new NotFoundException();
        }

        const result = await this.clientRepository.save(
            _.merge(client, updateData),
        );

        return _.omit(result, ['publicKey', 'privateKey']);
    }

    public async verifyClient(clientId: string, deviceId: string) {
        const client = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
            select: ['id', 'deviceId', 'verified'],
        });

        if (
            !client.verified &&
            Boolean(deviceId) &&
            Boolean(client.deviceId) &&
            deviceId === client.deviceId
        ) {
            client.verified = true;
            await this.clientRepository.save(client);
            return { verified: true };
        }

        return { verified: false };
    }

    public async requestClientChannel({
        channel,
        clientId,
        scope: scopeId,
        requestBody = {},
        timeoutThreshold = 30000,
    }: {
        channel?: ChannelDTO,
        clientId: string,
        scope: string,
        requestBody?: any,
        timeoutThreshold?: number,
    }) {
        let channelId: string;

        if (_.isString(channel?.id)) {
            channelId = channel.id;
        } else if (_.isString(scopeId)) {
            channelId = scopeId;
        }

        if (!_.isString(channelId) || !_.isString(clientId)) {
            throw new BadRequestException();
        }

        if (!channelId.startsWith('pugio.')) {
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
                throw new ForbiddenException();
            }
        }

        return new Promise((resolve, reject) => {
            const requestId = uuidv5(`${new Date().toISOString()}$${channelId}`, clientId);

            const requestChannelId = this.utilService.generateChannelName(clientId, 'channel_request');
            const responseChannelId = this.utilService.generateChannelName(clientId, 'channel_response');

            const eventId = `${responseChannelId}$${requestId}`;

            const handler = ({ data, errored }) => {
                this.emitter.off(eventId, handler);
                resolve({
                    id: requestId,
                    errored,
                    data,
                });
            };

            this.emitter.on(eventId, handler);

            this.redisClient.PUBLISH(
                requestChannelId,
                JSON.stringify({
                    id: requestId,
                    scope: channelId,
                    options: requestBody,
                }),
            );

            setTimeout(() => {
                reject(new InternalServerErrorException(ERR_CLIENT_REQUEST_TIMED_OUT));
            }, timeoutThreshold);
        });
    }

    public async pushChannelResponse(
        {
            clientId,
            requestId,
            data,
            errored = false,
        }: {clientId: string, requestId: string, data: any, errored: boolean },
    ) {
        const channelId = this.utilService.generateChannelName(clientId, 'channel_response');
        const eventId = `${channelId}$${requestId}`;
        const accepted = this.emitter.emit(eventId, { data, errored });

        return { accepted };
    }

    public pushChannelGateway(client: ClientDTO, eventId: string, data: any) {
        try {
            this.appGateway.sendMessage(client.id, eventId, data);
            return { accepted: true };
        } catch (e) {
            return { accepted: false };
        }
    }

    public async requestClientUserRelation(user: UserDTO, client?: ClientDTO, clientId?: string) {
        const targetClientId = client?.id || clientId;

        if (!targetClientId || !user?.id) {
            throw new BadRequestException();
        }

        try {
            return await this.userClientRepository.findOneOrFail({
                where: {
                    user: {
                        id: user.id,
                    },
                    client: {
                        id: targetClientId,
                    },
                },
                relations: ['user', 'client'],
            });
        } catch (e) {
            throw new NotFoundException();
        }
    }
}
