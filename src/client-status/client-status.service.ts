import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { Between, FindConditions, Repository } from 'typeorm';
import { ClientStatusDTO } from './dto/client-status.dto';
import * as _ from 'lodash';
import * as NodeRSA from 'node-rsa';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class ClientStatusService {
    public constructor(
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
        system: string,
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

        const lastRecord = await this.clientStatusRepository.findOne({
            where: {
                client: {
                    id: client.id,
                },
            },
            order: {
                createdAt: 'DESC',
            },
        });

        const report = await this.clientStatusRepository.save(
            this.clientStatusRepository.create({
                reporter,
                client,
                status,
                system,
                ...(lastRecord ? {
                    previous: {
                        id: lastRecord.id,
                    },
                } : {}),
            }),
        );

        return report;
    }

    public async getClientSystemStatus(
        clientId: string,
        pathname: string,
        dateRange: [Date, Date],
        count: number,
    ) {
        const result = {
            os: {},
            statistics: [],
            count: 0,
        };

        try {
            const record = await this.clientStatusRepository.findOne({
                where: {
                    client: {
                        id: clientId,
                    },
                },
                order: {
                    createdAt: 'DESC',
                },
                relations: ['client', 'previous'],
            });

            const systemInfo = JSON.parse(record.system) || {};

            result.os = systemInfo?.os;
        } catch (e) {}

        if (!_.isArray(dateRange) || dateRange.length !== 2) {
            return result;
        }

        const startTimestamp = dateRange[0].getTime();
        const endTimestamp = dateRange[1].getTime();

        if (startTimestamp >= endTimestamp) {
            return result;
        }

        const milliseconds = endTimestamp - startTimestamp;
        const step = milliseconds / count;

        let data: ClientStatusDTO[];

        if (step / 60000 < 2) {
            data = await this.clientStatusRepository.find({
                where: {
                    client: {
                        id: clientId,
                    },
                    createdAt: Between(dateRange[0], dateRange[1]),
                },
                order: {
                    createdAt: 'ASC',
                },
            });
        } else {
            const ranges = [];
            const halfOfThreshold = 0.75 * 60 * 1000;
            let middleTimestamp = startTimestamp + halfOfThreshold;

            while (middleTimestamp + halfOfThreshold < endTimestamp) {
                ranges.push([
                    new Date(middleTimestamp - halfOfThreshold),
                    new Date(middleTimestamp + halfOfThreshold),
                ]);
                middleTimestamp = middleTimestamp + step;
            }

            if (ranges.length === 0) {
                return result;
            }

            data = await this.clientStatusRepository.find({
                where: ranges.map((range) => {
                    return {
                        client: {
                            id: clientId,
                        },
                        createdAt: Between(range[0], range[1]),
                    };
                }) as FindConditions<ClientStatusDTO>[],
                order: {
                    createdAt: 'ASC',
                },
                relations: ['previous'],
            });

            data = data.reduce((result: ClientStatusDTO[], dataItem) => {
                const currentResult = Array.from(result);
                const lastDataItem = _.last(currentResult);

                if (lastDataItem && lastDataItem.id === dataItem?.previous?.id) {
                    currentResult.pop();
                }

                currentResult.push(dataItem);

                return currentResult;
            }, []) as ClientStatusDTO[];
        }

        if (data.length === 0) {
            return result;
        }

        result.statistics = data.map((dataItem) => {
            try {
                const systemInfo = JSON.parse(dataItem.system) || {};
                const data = _.get(systemInfo, pathname);
                const {
                    createdAt,
                    updatedAt,
                } = dataItem;

                return {
                    data,
                    createdAt,
                    updatedAt,
                };
            } catch (e) {
                return null;
            }
        }).filter((dataItem) => !!dataItem);

        result.count = result.statistics.length;

        return result;
    }

    public async getClientCurrentStatus(clientId: string, offlineThreshold = 60000) {
        const statusResult = {
            offline: false,
            statusCode: 1,
            systemInfo: {},
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

        try {
            statusResult.systemInfo = _.get(
                JSON.parse(latestStatus.system),
                'os',
            ) || {};
        } catch (e) {}

        return statusResult;
    }
}
