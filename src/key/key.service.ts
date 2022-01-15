import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as _ from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDTO } from 'src/user/dto/user.dto';
import { Repository } from 'typeorm';
import { KeyDTO } from './dto/key.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import { v5 as uuidv5 } from 'uuid';

@Injectable()
export class KeyService {
    public constructor(
        @InjectRepository(KeyDTO)
        private readonly keyRepository: Repository<KeyDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
    ) {}

    public async createApiKey(user: UserDTO) {
        const { id } = user;
        const seed = Buffer.from(
            [
                Math.random().toString(32),
                Date.now().toString(),
                id,
            ].join(':'),
        ).toString('base64');

        const content = uuidv5(id, seed);

        const newAPIKey = this.keyRepository.create({
            owner: {
                id,
            },
            keyId: content,
        });

        return await this.keyRepository.save(newAPIKey);
    }

    public async validateApiKey(apiKey: string) {
        const result = await this.keyRepository.findOne({
            where: {
                keyId: apiKey,
            },
            relations: ['owner'],
        });

        if (!result) {
            throw new UnauthorizedException();
        }

        return result.owner;
    }

    public async validateClientKey(encodedClientKey: string) {
        const result: {
            user?: UserDTO,
            client?: ClientDTO,
        } = {
            user: null,
            client: null,
        };

        if (!encodedClientKey || !_.isString(encodedClientKey)) {
            return result;
        }

        const [
            apiKey,
            clientId,
        ] = Buffer.from(encodedClientKey, 'base64').toString().split(':');

        const user = await this.validateApiKey(apiKey);
        const client = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
        });

        if (!client) {
            throw new NotFoundException();
        }

        if (!user) {
            return result;
        }

        result.user = user;

        const userClient = await this.userClientRepository.findOne({
            where: {
                user: {
                    id: user.id,
                },
                client: {
                    id: clientId,
                },
            },
            relations: ['client'],
        });

        if (!userClient) {
            return result;
        }

        result.client = userClient.client;

        return result;
    }
}
