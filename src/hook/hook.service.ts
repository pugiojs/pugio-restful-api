import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { TaskDTO } from 'src/task/dto/task.dto';
import { UtilService } from 'src/util/util.service';
import { Repository } from 'typeorm';
import { HookDTO } from './dto/hook.dto';
import * as Handlebars from 'handlebars';
import * as _ from 'lodash';
import { v5 as uuidv5 } from 'uuid';
import * as NodeRSA from 'node-rsa';

@Injectable()
export class HookService {
    private redisClient: Redis;

    public constructor(
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(HookDTO)
        private readonly hookRepository: Repository<HookDTO>,
    ) {
        this.redisClient = this.redisService.getClient();
    }

    public async createHook(clientId: string, data: Partial<HookDTO>) {
        const hookData = _.pick(
            data,
            [
                'name',
                'description',
                'mapper',
                'preCommandSegment',
                'postCommandSegment',
                'template',
                'executionCwd',
            ],
        );

        const hook = await this.hookRepository.save(
            this.hookRepository.create({
                ...hookData,
                client: {
                    id: clientId,
                },
            }),
        );

        return _.omit(hook, ['client']);
    }

    public async sendExecutionTask(hookId: string, props: Record<string, any> = {}) {
        const hook = await this.hookRepository
            .createQueryBuilder('hook')
            .leftJoinAndSelect('hook.client', 'client')
            .addSelect('client.publicKey')
            .where('hook.id = :hookId', { hookId })
            .getOne();

        if (!hook || !hook.client) {
            throw new NotFoundException();
        }

        let taskStatus = 1;

        const {
            id: clientId,
            publicKey: clientPublicKey,
        } = hook.client;

        if (!_.isString(clientPublicKey)) {
            taskStatus = -3;
        }

        const clientTaskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const clientTaskChannelName = this.utilService.generateExecutionTaskChannelName(clientId);

        await this.redisClient.persist(clientTaskQueueName);

        let gotLock = false;

        const {
            error,
            data,
        } = await this.clientService.lockExecutionTaskChannel(clientId);

        if (!error && data) {
            gotLock = true;
        }

        if (error || !gotLock) {
            taskStatus = -4;
        }

        const {
            template,
            executionCwd,
        } = hook;

        let scriptContent: string = null;

        if (_.isString(template)) {
            try {
                const render = Handlebars.compile(template);
                scriptContent = render(props);
            } catch (e) {
                taskStatus = -2;
            }
        }

        const taskAesKey = uuidv5(
            new Date().toISOString + Math.random().toString(32),
            hook.id,
        );

        const newTask = await this.taskRepository.save(
            this.taskRepository.create({
                script: scriptContent,
                status: taskStatus,
                executionCwd,
                props: JSON.stringify(props),
                aesKey: taskAesKey,
            }),
        );

        let encryptedTaskAesKey;

        try {
            const rsaPublicKey = new NodeRSA({ b: 1024 }).importKey(
                clientPublicKey,
                'pkcs8-public-pem',
            );
            encryptedTaskAesKey = rsaPublicKey.encrypt(taskAesKey, 'base64');
        } catch (e) {
            taskStatus = -3;
        }

        if (taskStatus < 0) {
            return _.omit(newTask, 'aesKey');
        }

        await this.redisClient.RPUSH(
            clientTaskQueueName,
            newTask.id,
        );
        this.redisClient.publish(clientTaskChannelName, encryptedTaskAesKey);

        return _.omit(newTask, 'aesKey');
    }
}
