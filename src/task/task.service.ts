import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { UtilService } from 'src/util/util.service';
import { Redis } from 'ioredis';
import { ClientService } from 'src/client/client.service';
import { ERR_FAILED_TO_GET_LOCK } from 'src/app.constants';
import { EventService } from 'src/event/event.service';
import { ClientGateway } from 'src/client/client.gateway';

@Injectable()
export class TaskService {
    private redisClient: Redis;

    public constructor(
        private readonly eventService: EventService,
        private readonly clientGateway: ClientGateway,
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
    ) {
        this.eventService.setGateway(this.clientGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTask(clientId: string) {
        const taskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const taskId = await this.redisClient.lpop(taskQueueName);

        return {
            taskId: taskId || null,
        };
    }

    public async sendExecutionTask(clientId: string) {
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
