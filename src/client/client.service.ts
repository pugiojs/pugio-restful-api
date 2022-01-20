import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { UtilService } from 'src/util/util.service';
import { LockerService } from 'src/locker/locker.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientDTO } from './dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { ClientDAO } from './dao/client.dao';
import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import { v5 as uuidv5 } from 'uuid';
import * as _ from 'lodash';
import { SHA256 } from 'crypto-js';

@Injectable()
export class ClientService {
    private redisClient: Redis;

    public constructor(
        private readonly utilService: UtilService,
        private readonly lockerService: LockerService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
        private readonly redisService: RedisService,
    ) {
        this.redisClient = this.redisService.getClient();
    }

    public async lockExecutionTaskChannel(clientId: string, retryTimes?: number) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.lock(lockName, retryTimes);
    }

    public async unlockExecutionTaskChannel(clientId: string, value: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.unlock(lockName, value);
    }

    public async checkPermission(
        userId: string,
        clientId: string,
        permission: number,
    ) {
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
            });

        if (relations.length === 0) {
            return false;
        }

        if (permission === -1) {
            return true;
        }

        return relations.some((relation) => relation.roleType === permission);
    }

    public async createClient(user: UserDTO, configuration: ClientDAO) {
        const {
            name,
            description,
            deviceId,
            publicKey,
            privateKey,
        } = this.utilService.transformDAOToDTO<ClientDAO, ClientDTO>(configuration);

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

    public async handleMakeChallenge(client: ClientDTO) {
        let clientRedisInfo;

        try {
            clientRedisInfo = await this.redisClient.aclGetUser(client.id);
        } catch (e) {}

        const seed = Math.random().toString(32).slice(2) + Date.now().toString();

        const newPassword = Buffer
            .from(
                seed +
                '@' +
                uuidv5(seed, client.id),
            )
            .toString('base64');

        await this.setClientCredential(client.id, newPassword);

        return {
            credential: newPassword,
            taskChannel: this.utilService.generateExecutionTaskChannelName(client.id),
        };
    }

    public async handleChannelConnection(client: ClientDTO) {
        // TODO
    }

    private async setClientCredential(
        clientId: string,
        newPassword: string,
        oldPassword?: string,
    ) {
        if (!newPassword || !_.isString(newPassword)) {
            throw new BadRequestException();
        }

        let clientInfo;

        try {
            clientInfo = await this.redisClient.aclGetUser(clientId);
        } catch (e) {
            throw new NotFoundException();
        }

        if (clientInfo) {
            const passwords = _.get(clientInfo, 'passwords') || [];

            if (
                passwords.length > 0 &&
                    _.isString(oldPassword) &&
                    passwords.indexOf(SHA256(oldPassword))
            ) {
                throw new ForbiddenException();
            }

            await Promise.all(passwords.map((password) => {
                return this.redisClient.aclSetUser(clientId, ['on', '!' + password]);
            }));
        }

        await this.redisClient.aclSetUser(
            clientId,
            [
                'on',
                '>' + newPassword,
                '~' + clientId + ':*',
                '-@all',
            ],
        );

        const newClientInfo = await this.redisClient.aclGetUser(clientId);
        return _.omit(newClientInfo, 'passwords');
    }
}
