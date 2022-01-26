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

@Injectable()
export class TaskService {
    private redisClient: Redis;

    public constructor(
        private readonly eventService: EventService,
        private readonly taskGateway: TaskGateway,
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(ExecutionDTO)
        private readonly executionRepository: Repository<ExecutionDTO>,
    ) {
        this.eventService.setGateway(this.taskGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTask(client: ClientDTO) {
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

        if (status < 0) {
            await this.taskRepository.update({ id }, { status });
        }

        if (error) {
            throw error;
        }

        return {
            id,
            executionCwd,
            executionData,
        };
    }

    public async reportTaskExecution(
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

        task.status = status;
        let decryptedContent: string = null;

        const executionRecords = _.get(task, 'executions') || [];

        if (executionRecords.some((record) => record.sequence === sequence)) {
            throw new BadRequestException();
        }

        try {
            decryptedContent = Crypto
                .AES
                .decrypt(encryptedContent, task.aesKey)
                .toString();
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

        return executionRecord;
    }
}
