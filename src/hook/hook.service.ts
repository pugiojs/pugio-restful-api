import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERR_FAILED_TO_GET_LOCK } from 'src/app.constants';
import { ClientService } from 'src/client/client.service';
import { TaskDTO } from 'src/task/dto/task.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { UtilService } from 'src/util/util.service';
import { Repository } from 'typeorm';
import { HookDTO } from './dto/hook.dto';
import * as Handlebars from 'handlebars';
import * as _ from 'lodash';

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

    public async sendExecutionTask(hookId: string, user: UserDTO, props: Record<string, any> = {}) {
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
        const clientTaskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const clientTaskChannelName = this.utilService.generateExecutionTaskChannelName(clientId);

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

        const {
            template,
            executionCwd,
        } = hook;

        let scriptContent: string = null;
        let scriptParseErrored = false;

        if (_.isString(template)) {
            try {
                const render = Handlebars.compile(template);
                scriptContent = render(props);
            } catch (e) {
                scriptParseErrored = true;
            }
        }

        const newTask = await this.taskRepository.save(
            this.taskRepository.create({
                script: scriptContent,
                status: scriptParseErrored ? -2 : 1,
                executionCwd,
                props: JSON.stringify(props),
            }),
        );

        if (!scriptParseErrored) {
            await this.redisClient.RPUSH(
                clientTaskQueueName,
                newTask.id,
            );

            this.redisClient.publish(clientTaskChannelName, new Date().toISOString());
        }

        return newTask;
    }
}
