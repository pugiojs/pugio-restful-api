import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { UtilService } from 'src/util/util.service';
import { Redis } from 'ioredis';
import { ClientService } from 'src/client/client.service';
import { ERR_FAILED_TO_GET_LOCK } from 'src/app.constants';
import { EventService } from 'src/event/event.service';
import { TaskGateway } from './task.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HookDTO } from 'src/hook/dto/hook.dto';
import { UserDTO } from 'src/user/dto/user.dto';

@Injectable()
export class TaskService {
    private redisClient: Redis;

    public constructor(
        private readonly eventService: EventService,
        private readonly taskGateway: TaskGateway,
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
        // @InjectRepository(TaskDTO)
        // private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(HookDTO)
        private readonly hookRepository: Repository<HookDTO>,
    ) {
        this.eventService.setGateway(this.taskGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTask(clientId: string) {
        const taskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const taskId = await this.redisClient.lpop(taskQueueName);

        return {
            taskId: taskId || null,
        };
    }

    public async sendExecutionTask(hookId: string, user: UserDTO) {
        const hook = await this.hookRepository
            .findOne({
                where: {
                    id: hookId,
                },
                relations: ['client'],
            });

        if (!hook || !hook.client) {
            throw new NotFoundException();
        }

        const clientId = hook.client.id;

        if (!(await this.clientService.checkPermission(user.id, clientId, -1))) {
            throw new ForbiddenException();
        }

        const clientTaskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const clientTaskChannelName = this.utilService.generateExecutionTaskChannelName(clientId);

        (async () => {
            await this.redisClient.persist(clientTaskQueueName);
            let gotLock = false;

            const {
                error,
                data,
            } = await this.clientService.lockExecutionTaskChannel(clientId);

            if (error) {
                throw new InternalServerErrorException(data);
            }

            if (!error && data) {
                gotLock = true;
            }

            if (!gotLock) {
                throw new InternalServerErrorException(ERR_FAILED_TO_GET_LOCK);
            }

            await this.redisClient.rpush(
                clientTaskQueueName,
                // TODO
                new Date().toISOString() + Math.random().toString(32).slice(2),
            );

            this.redisClient.publish(clientTaskChannelName, new Date().toISOString());
        })();

        // TODO sync process
        const result = await new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'WAITING',
                });
            }, 3000);
        });

        return result;
    }
}
