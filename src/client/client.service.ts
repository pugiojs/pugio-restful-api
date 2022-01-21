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
import * as _ from 'lodash';

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
        permission: number | number[] = -1,
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

        const permissionList = _.isNumber(permission)
            ? [permission]
            : permission;

        return relations.some((relation) => permissionList.indexOf(relation.roleType) !== -1);
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
        if (!(client)) {
            throw new BadRequestException();
        }

        const clientId = client.id;
        const credential = await this.utilService.generateRandomPassword(clientId);

        await this.redisClient.aclSetUser(
            clientId,
            [
                'on',
                '>' + credential,
                'resetchannels',
                '~' + clientId + ':*',
                '-@all',
            ],
        );
        await this.redisClient.aclSetUser(clientId, ['&' + clientId + '@*']);

        const newClientInfo = await this.redisClient.aclGetUser(clientId);
        const taskChannelName = this.utilService.generateExecutionTaskChannelName(clientId);

        return {
            credential,
            taskChannelName,
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
}
