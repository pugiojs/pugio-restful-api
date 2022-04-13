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
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import {
    ERR_CLIENT_REQUEST_TIMED_OUT,
    ERR_CLIENT_UNVERIFIED,
    ERR_CLIENT_VERSION_NOT_SUPPORT,
} from 'src/app.constants';
import * as semver from 'semver';
import { v5 as uuidv5 } from 'uuid';
import * as EventEmitter from 'events';
import { ClientGateway } from './client.gateway';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { ChannelDTO } from 'src/channel/dto/channel.dto';

@Injectable()
export class ClientService {
    private redisClient: Redis;
    private emitter: EventEmitter;

    public constructor(
        private readonly utilService: UtilService,
        private readonly clientGateway: ClientGateway,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
        @InjectRepository(ChannelClientDTO)
        private readonly channelClientRepository: Repository<ChannelClientDTO>,
        private readonly redisService: RedisService,
    ) {
        this.redisClient = this.redisService.getClient();
        this.emitter = new EventEmitter();
    }
    public async checkPermission(
        {
            userId,
            clientId,
            permission = -1,
            checkDeviceId = false,
            version = [],
        }: {
            userId?: string,
            clientId: string,
            permission?: number | number[],
            checkDeviceId?: boolean,
            version?: string | string[],
        },
    ) {
        if (!_.isString(userId) || !userId) {
            return true;
        }

        const relations = await this.userClientRepository
            .find({
                where: {
                    user: {
                        id: userId,
                    },
                    client: {
                        id: clientId,
                    },
                },
                relations: ['client'],
            });

        if (relations.length === 0) {
            return false;
        }

        if (
            checkDeviceId &&
            relations.some((relation) => !relation.client.verified)
        ) {
            throw new ForbiddenException(ERR_CLIENT_UNVERIFIED);
        }

        if (_.isString(version) || (_.isArray(version) && version.length > 0)) {
            let compareType: string;
            let minVersion: string;
            let maxVersion: string;
            let canUse = true;

            if (_.isString(version)) {
                compareType = 'gte';
                minVersion = version;
            } else if (_.isArray(version)) {
                const [min, max] = version;
                if (_.isString(min) && _.isString(max)) {
                    compareType = 'between';
                    minVersion = min;
                    maxVersion = max;
                } else if (_.isString(min) && !_.isString(max)) {
                    compareType = 'gte';
                    minVersion = min;
                } else if (!_.isString(min) && _.isString(max)) {
                    compareType = 'lte';
                    maxVersion = max;
                }
            }

            if (!compareType) {
                return canUse;
            }

            canUse = relations.some((relation) => {
                const clientVersion = relation.client.version;

                switch (compareType) {
                    case 'gte': {
                        return semver.gte(clientVersion, minVersion);
                    }
                    case 'lte': {
                        return semver.lte(clientVersion, maxVersion);
                    }
                    case 'between': {
                        return semver.gte(clientVersion, minVersion) && semver.lte(clientVersion, maxVersion);
                    }
                    default: {
                        return true;
                    }
                }
            });

            if (!canUse) {
                throw new ForbiddenException(ERR_CLIENT_VERSION_NOT_SUPPORT);
            }
        }

        if (permission === -1) {
            return true;
        }

        const permissionList = _.isNumber(permission)
            ? [permission]
            : permission;

        return relations.some((relation) => permissionList.indexOf(relation.roleType) !== -1);
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

        return result.client;
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

    public async handleCreateMembership(
        user: UserDTO,
        clientId: string,
        newUserId: string,
        roleType: number,
    ) {
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

        if (roleType < currentRelationship.roleType) {
            throw new ForbiddenException();
        }

        if (roleType === 0) {
            await this.userClientRepository.delete({
                id: currentRelationship.id,
            });
        }

        const newOwnerShipConfig = {
            user: {
                id: newUserId,
            },
            client: {
                id: clientId,
            },
        };

        let newOwnerRelationShip = await this.userClientRepository.findOne({
            where: newOwnerShipConfig,
        });

        if (!newOwnerRelationShip) {
            newOwnerRelationShip = this.userClientRepository.create(newOwnerShipConfig);
        }

        newOwnerRelationShip.roleType = roleType;

        const result = await this.userClientRepository.save(newOwnerRelationShip);

        return _.omit(result, ['user', 'client']);
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
            this.clientGateway.server.to(client.id).emit(
                eventId,
                data,
            );

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
            return {};
        }
    }
}
