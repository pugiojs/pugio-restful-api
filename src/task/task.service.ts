import {
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
import * as NodeRSA from 'node-rsa';
import {
    ERR_CLIENT_PUB_KEY_NOTFOUND,
    ERR_ENCRYPT_FAILED,
} from 'src/app.constants';

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
            ],
        });

        if (!task) {
            throw new NotFoundException();
        }

        let status = 2;
        let error: Error = null;

        const { publicKey } = await this.clientRepository.findOne({
            where: {
                id: client.id,
            },
            select: ['publicKey'],
        });

        if (!_.isString(publicKey)) {
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
        let executionData: string = null;

        try {
            const key = new NodeRSA({ b: 1024 });
            key.importKey(publicKey);
            executionData = key.encrypt(JSON.stringify(executionConfig), 'base64');
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
}
