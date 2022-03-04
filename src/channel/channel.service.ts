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
import { ClientDTO } from 'src/client/dto/client.dto';

@Injectable()
export class ChannelService {
    public constructor(
        private readonly utilService: UtilService,
        @InjectRepository(ChannelDTO)
        private readonly channelRepository: Repository<ChannelDTO>,
        @InjectRepository(ChannelClientDTO)
        private readonly channelClientRepository: Repository<ChannelClientDTO>,
    ) {}

    public async queryChannels(creatorId: string, options: PaginationQueryServiceOptions<ChannelDTO> = {}) {
        const result = await this.utilService.queryWithPagination<ChannelDTO>({
            ...(creatorId ? {
                queryOptions: {
                    where: {
                        creator: {
                            id: creatorId,
                        },
                    },
                },
            } : {}),
            searchKeys: ['name', 'id', 'description', 'packageName'] as any[],
            repository: this.channelRepository,
            ...options,
        });

        return result;
    }

    public async queryClientChannels(
        clientId: string,
        options: PaginationQueryServiceOptions<ChannelClientDTO> = {},
    ) {
        const result = await this.utilService.queryWithPagination<ChannelClientDTO>({
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
            ...options,
        });

        return {
            ...result,
            items: result.items.map((item) => _.omit(item, ['client'])),
        };
    }

    public async getChannelInfo(channelId: string) {
        const result = await this.channelRepository.findOne({
            where: {
                id: channelId,
            },
        });

        if (!result) {
            throw new NotFoundException();
        }

        return result;
    }

    public async createChannel(creator: UserDTO, data: Partial<ChannelDTO>) {
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
                creator,
            }),
        );

        return channel;
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
            'packageName',
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

    public async getChannelClientRelation(channelId: string, clientId?: string, client?: ClientDTO) {
        if ((!_.isString(clientId) && !client) || !_.isString(channelId)) {
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
}
