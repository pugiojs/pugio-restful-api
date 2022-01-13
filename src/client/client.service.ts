import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { EventService } from 'src/event/event.service';
import * as child_process from 'child_process';
import { ClientGateway } from './client.gateway';
import { RedisService } from 'nestjs-redis';
import * as IORedis from 'ioredis';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class ClientService {
    private redisClient: IORedis.Redis;
    private logger: Logger = new Logger('ClientService');

    public constructor(
        private readonly eventService: EventService,
        private readonly clientGateway: ClientGateway,
        private readonly redisService: RedisService,
        private readonly utilService: UtilService,
    ) {
        this.eventService.setGateway(this.clientGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async sendExecutionResult(executionId: number, command: string) {
        return new Promise((resolve, reject) => {
            const [mainCommand, ...args] = command.split(' ');
            const proc = child_process.spawn(mainCommand, args);
            proc.stdout.on('data', (data) => {
                this.eventService.broadcast(`execution@${executionId}`, 'execution_result', {
                    from: executionId,
                    block: data.toString(),
                });
            });
            proc.on('close', () => resolve(undefined));
        });
    }

    public async sendExecutionTask(clientId: string) {
        const clientTaskQueueName = `${clientId}:task_queue`;
        const clientTasksLockName = `${clientId}:tasks_lock`;
        const clientTaskChannelName = `${clientId}@execution`;

        // TODO: sync process
        const result = await new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'WAITING',
                });
            }, 3000);
        });

        (async () => {
            await this.redisClient.persist(clientTaskQueueName);

            while (await this.redisClient.get(clientTasksLockName) !== null) {
                this.logger.log('Waiting for unlock');
                await this.utilService.sleep();
            }

            await this.redisClient.setnx(clientTasksLockName, 1);
            await this.redisClient.expire(clientTasksLockName, 30);
            await this.redisClient.rpush(
                clientTaskQueueName,
                // TODO
                new Date().toISOString() + Math.random().toString(32).slice(2),
            );

            this.redisClient.publish(clientTaskChannelName, new Date().toISOString());
        })();

        return result;
    }
}
