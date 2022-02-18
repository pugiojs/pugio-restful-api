import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { Repository } from 'typeorm';
import { ClientStatusDTO } from './dto/client-status.dto';
import * as _ from 'lodash';
import * as NodeRSA from 'node-rsa';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class ClientStatusService {
    public constructor(
        private readonly utilService: UtilService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(ClientStatusDTO)
        private readonly clientStatusRepository: Repository<ClientStatusDTO>,
    ) {}

    public async reportClientStatus(
        reporter: UserDTO,
        client: ClientDTO,
        plaintext: string,
        cipher: string,
    ) {
        const {
            publicKey,
            privateKey,
        } = await this.clientRepository.findOne({
            where: {
                id: client.id,
            },
            select: ['publicKey', 'privateKey'],
        });

        let status = 1;

        if (!_.isString(publicKey) || !_.isString(privateKey)) {
            status = -2;
        }

        try {
            const keyPair = new NodeRSA({ b: 1024 })
                .importKey(publicKey, 'pkcs8-public-pem')
                .importKey(privateKey, 'pkcs8-private-pem');

            const decryptedText = keyPair.decrypt(cipher, 'utf8');

            if (!(
                _.isString(plaintext) &&
                _.isString(decryptedText) &&
                decryptedText === plaintext
            )) {
                status = -1;
            }
        } catch (e) {
            status = -1;
        }

        const report = await this.clientStatusRepository.save(
            this.clientStatusRepository.create({
                reporter,
                client,
                status,
            }),
        );

        return report;
    }

    public async queryClientStatuses(
        clientId: string,
        queryOptions: PaginationQueryServiceOptions<ClientStatusDTO>,
    ) {
        const result = await this.utilService.queryWithPagination({
            ...queryOptions,
            repository: this.clientStatusRepository,
            queryOptions: {
                where: {
                    client: {
                        id: clientId,
                    },
                },
                relations: ['reporter'],
            },
        });

        return result;
    }

    public async getClientCurrentStatus(clientId: string, offlineThreshold = 60000) {
        const statusResult = {
            offline: false,
            statusCode: 1,
        };

        const [latestStatus] = await this.clientStatusRepository.find({
            where: {
                client: {
                    id: clientId,
                },
            },
            order: {
                createdAt: 'DESC',
            },
            take: 1,
        });

        if (!latestStatus) {
            statusResult.offline = true;
            return statusResult;
        }

        if (
            (
                Date.parse(new Date().toISOString()) -
                Date.parse(latestStatus.createdAt.toISOString())
            ) > offlineThreshold
        ) {
            statusResult.offline = true;
        }

        statusResult.statusCode = latestStatus.status;

        return statusResult;
    }
}
