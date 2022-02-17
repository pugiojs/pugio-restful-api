import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Inject,
    mixin,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UtilService } from 'src/util/util.service';
import { ClientService } from '../client/client.service';
import * as _ from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { memoize } from 'src/app.util';
import { ResourceBaseInterceptorOptions } from 'src/app.interfaces';
import { TaskDTO } from './dto/task.dto';

const createTaskInterceptor = ({
    sources = 'params',
    paths = '$.task_id',
    type = -1,
    checkDeviceId = false,
}: ResourceBaseInterceptorOptions = {}) => {
    class MixinTaskInterceptor implements NestInterceptor {
        public constructor(
        @Inject(ClientService)
        private readonly clientService: ClientService,
        @Inject(UtilService)
        private readonly utilService: UtilService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        ) {}

        public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
            const request = context.switchToHttp().getRequest();
            const userId = _.get(request, 'user.id');
            const taskId = this.utilService.getResourceIdentityFromContext(context, sources, paths);

            if (!taskId) {
                return next.handle();
            }

            const task = await this.taskRepository.findOne({
                where: {
                    id: taskId,
                },
                relations: ['hook', 'hook.client'],
            });

            if (!task) {
                return next.handle();
            }

            const clientId = _.get(task, 'hook.client.id');

            if (
                _.isString(clientId) &&
                !(await this.clientService.checkPermission({userId, clientId, permission: type, checkDeviceId }))
            ) {
                throw new ForbiddenException();
            }

            return next.handle();
        }
    }

    const interceptor = mixin(MixinTaskInterceptor);
    return interceptor;
};

export const TaskInterceptor: (
    options: ResourceBaseInterceptorOptions,
) => NestInterceptor = memoize(createTaskInterceptor);
