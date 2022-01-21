import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERR_FAILED_TO_GET_LOCK } from 'src/app.constants';
import { ClientService } from 'src/client/client.service';
import { ClientDTO } from 'src/client/dto/client.dto';
import { TaskDTO } from 'src/task/dto/task.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { UtilService } from 'src/util/util.service';
import { Repository } from 'typeorm';
import { HookDTO } from './dto/hook.dto';

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
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
    ) {
        this.redisClient = this.redisService.getClient();
    }

    public async sendExecutionTask(hookId: string, user: UserDTO, content: Record<string, any>) {
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

        const {
            publicKey: clientPublicKey,
        } = await this.clientRepository.findOne({
            where: {
                id: clientId,
            },
            select: ['privateKey', 'publicKey'],
        });

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
            mapper,
            template,
            postCommandSegment = '',
            preCommandSegment = '',
            executionCwd,
        } = hook;

        // TODO mapper map correct props
        // TODO generate script using template
        // TODO generate RSA-encrypted script content

        const newTask = await this.taskRepository.save(
            this.taskRepository.create({
                // TODO encrypted script content here
                postCommandSegment,
                preCommandSegment,
                executionCwd,
            }),
        );

        await this.redisClient.RPUSH(
            clientTaskQueueName,
            newTask.id,
        );

        this.redisClient.publish(clientTaskChannelName, new Date().toISOString());

        return newTask;
    }
}
