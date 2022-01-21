import {
    Injectable,
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
    ) {
        this.eventService.setGateway(this.taskGateway);
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTask(clientId: string) {
        const taskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);
        const taskId = await this.redisClient.LPOP(taskQueueName);

        return {
            taskId: taskId || null,
        };
    }
}
