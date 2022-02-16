import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import { UtilService } from 'src/util/util.service';
import { EventService } from 'src/event/event.service';
import { TaskGateway } from './task.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import {
    In,
    Repository,
} from 'typeorm';
import { TaskDTO } from './dto/task.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import * as _ from 'lodash';
import * as Crypto from 'crypto-js';
import * as yup from 'yup';
import { ExecutionDTO } from 'src/execution/dto/execution.dto';
import { ClientService } from 'src/client/client.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import * as NodeRSA from 'node-rsa';

@Injectable()
export class TaskService {
    private redisClient: Redis;

    public constructor(
        private readonly eventService: EventService,
        private readonly taskGateway: TaskGateway,
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(ExecutionDTO)
        private readonly executionRepository: Repository<ExecutionDTO>,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
    ) {
        this.eventService.setGateway(this.taskGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTasks(
        user: UserDTO,
        client: ClientDTO,
        all: number,
        singleLockPass: string,
    ) {
        console.log('singleLockPass:', singleLockPass);
        const permission = await this.clientService.checkPermission(
            user.id,
            client.id,
            -1,
        );

        if (!permission) {
            throw new ForbiddenException();
        }

        const taskQueueName = this.utilService.generateExecutionTaskQueueName(client.id);
        let taskIdList: string[] = [];

        if (all === 1) {
            const {
                data: lockPass,
            } = await this.clientService.lockExecutionTaskChannel(client.id);

            const unconsumedTaskIdList = await this.redisClient.LPOP_COUNT(
                taskQueueName,
                await this.redisClient.LLEN(taskQueueName),
            );

            taskIdList = taskIdList.concat(unconsumedTaskIdList);

            await this.clientService.unlockExecutionTaskChannel(client.id, lockPass);
        } else {
            taskIdList.push(await this.redisClient.LPOP(taskQueueName));

            if (!_.isString(singleLockPass)) {
                throw new BadRequestException();
            }

            console.log(111);
            await this.clientService.unlockExecutionTaskChannel(client.id, singleLockPass);
        }

        const tasks = await this.taskRepository.find({
            where: {
                id: In(taskIdList),
                status: 1,
                hook: {
                    client: {
                        id: client.id,
                    },
                },
            },
            select: [
                'id',
                'script',
                'hook',
                'aesKey',
            ],
            relations: ['hook'],
        });

        if (tasks.length === 0) {
            return [];
        }

        const { publicKey: clientPublicKey } = await this.clientRepository.findOne({
            where: {
                id: client.id,
            },
            select: ['publicKey'],
        });

        const result = [];

        for (const task of tasks) {
            let status = 2;
            const taskAesKey = task.aesKey;

            if (!_.isString(taskAesKey)) {
                status = -3;
            }

            const {
                id,
                script,
                hook,
            } = task;
            const {
                executionCwd,
                preCommandSegment,
                postCommandSegment,
            } = hook;

            const executionConfig = {
                script,
                preCommandSegment,
                postCommandSegment,
            };

            let executionData;
            let encryptedAesKey: string;

            try {
                if (!_.isString(clientPublicKey)) {
                    throw new Error();
                }

                const rawExecutionData = JSON.stringify(executionConfig);
                executionData = Crypto
                    .AES
                    .encrypt(rawExecutionData, taskAesKey)
                    .toString();
                const rsaPublicKey = new NodeRSA({ b: 1024 }).importKey(
                    clientPublicKey,
                    'pkcs8-public-pem',
                );

                encryptedAesKey = rsaPublicKey.encrypt(taskAesKey, 'base64');

                if (!_.isString(encryptedAesKey)) {
                    throw new Error();
                }
            } catch (e) {
                status = -3;
            }

            await this.taskRepository.update({ id }, { status });

            if (status === 2) {
                result.push({
                    id,
                    aesKey: encryptedAesKey,
                    executionCwd,
                    executionData,
                });
            }
        }

        return result;
    }

    public async pushTaskExecution(
        taskId: string,
        sequence: number,
        status = 3,
        encryptedContent = '',
    ) {
        const schema = yup.object().shape({
            taskId: yup.string().required(),
            sequence: yup.number().required(),
            status: yup.number().moreThan(-5).lessThan(5).optional(),
            content: yup.string().optional(),
        });

        if (!schema.isValidSync({ taskId, sequence, status, content: encryptedContent })) {
            throw new BadRequestException();
        }

        const task = await this.taskRepository.findOne({
            where: {
                id: taskId,
            },
            select: ['id', 'aesKey', 'executions'],
        });

        if (!task) {
            throw new NotFoundException();
        }

        if (task.status && task.status !== 3) {
            task.status = status;
        }

        let decryptedContent: string = null;

        const executionRecords = _.get(task, 'executions') || [];

        if (executionRecords.some((record) => record.sequence === sequence)) {
            throw new BadRequestException();
        }

        try {
            decryptedContent = Crypto
                .AES
                .decrypt(encryptedContent, task.aesKey)
                .toString(Crypto.enc.Utf8);
        } catch (e) {
            task.status = -3;
        }

        await this.taskRepository.save(task);

        const executionRecord = await this.executionRepository.save(
            this.executionRepository.create({
                task: {
                    id: taskId,
                },
                content: decryptedContent,
                sequence,
            }),
        );

        try {
            this.taskGateway.server.to(taskId).emit(
                'execution',
                JSON.stringify(_.omit(executionRecord, ['task'])),
            );
        } catch (e) {}

        return _.omit(executionRecord, ['task', 'sequence', 'content']);
    }

    public async getTask(taskId: string) {
        if (!taskId || !_.isString(taskId)) {
            throw new BadRequestException();
        }

        return await this.taskRepository.findOne({
            where: {
                id: taskId,
            },
        });
    }

    public async queryTasks(
        clientId: string,
        queryOptions: PaginationQueryServiceOptions<TaskDTO>,
    ) {
        const result = await this.utilService.queryWithPagination({
            ...queryOptions,
            repository: this.taskRepository,
            searchKeys: [
                'id',
                'props',
            ],
            queryOptions: {
                where: {
                    hook: {
                        client: {
                            id: clientId,
                        },
                    },
                },
                relations: ['hook', 'hook.client'],
            },
        });

        return result;
    }
}
