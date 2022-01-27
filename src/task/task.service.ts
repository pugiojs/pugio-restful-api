import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
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
import { Repository } from 'typeorm';
import { TaskDTO } from './dto/task.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import * as _ from 'lodash';
import * as Crypto from 'crypto-js';
import {
    ERR_CLIENT_PUB_KEY_NOTFOUND,
    ERR_ENCRYPT_FAILED,
} from 'src/app.constants';
import * as yup from 'yup';
import { ExecutionDTO } from 'src/execution/dto/execution.dto';
import { ClientService } from 'src/client/client.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';

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
    ) {
        this.eventService.setGateway(this.taskGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTask(user: UserDTO, client: ClientDTO) {
        const permission = await this.clientService.checkPermission(
            user.id,
            client.id,
            -1,
        );

        if (!permission) {
            throw new ForbiddenException();
        }

        const taskQueueName = this.utilService.generateExecutionTaskQueueName(client.id);
        const taskId = await this.redisClient.LPOP(taskQueueName);

        const task = await this.taskRepository.findOne({
            where: {
                id: taskId,
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
        });

        if (!task) {
            throw new NotFoundException();
        }

        let status = 2;
        let error: Error = null;
        const taskAesKey = task.aesKey;

        if (!_.isString(taskAesKey)) {
            status = -3;
            error = new ForbiddenException(ERR_CLIENT_PUB_KEY_NOTFOUND);
        }

        const { id, script, hook } = task;
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

        try {
            const rawExecutionData = JSON.stringify(executionConfig);
            executionData = Crypto
                .AES
                .encrypt(rawExecutionData, taskAesKey)
                .toString();
        } catch (e) {
            status = -3;
            error = new InternalServerErrorException(ERR_ENCRYPT_FAILED);
        }

        await this.taskRepository.update({ id }, { status });

        if (error) {
            throw error;
        }

        return {
            id,
            executionCwd,
            executionData,
        };
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

        await this.taskRepository.save(task);

        if (task.status) {
            task.status = status;
        } else {
            task.status = 3;
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
            this.taskGateway.server.to(taskId).emit('execution', JSON.stringify({
                taskId,
                sequence,
                content: decryptedContent,
            }));
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
