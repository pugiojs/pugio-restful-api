import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UtilService } from 'src/util/util.service';
import { Repository } from 'typeorm';
import { ChannelDTO } from './dto/channel.dto';
import * as _ from 'lodash';

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
            items: result.items.map((item) => item.channel),
        };
    }

    public async getChannelInfo(channelId: string) {
        try {
            const result = await this.channelRepository.findOne({
                where: {
                    id: channelId,
                },
            });

            return result;
        } catch (e) {
            return null;
        }
    }
}
