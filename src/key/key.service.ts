import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDTO } from 'src/user/dto/user.dto';
import { Repository } from 'typeorm';
import { KeyDTO } from './dto/key.dto';

@Injectable()
export class KeyService {
    public constructor(
        @InjectRepository(KeyDTO)
        private readonly keyRepository: Repository<KeyDTO>,
    ) {}

    public async createApiKey(user: UserDTO) {
        const { id } = user;
        const content = Buffer.from(
            [
                Math.random().toString(32),
                Date.now().toString(),
                id,
            ].join(':'),
        ).toString('base64');
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
}
