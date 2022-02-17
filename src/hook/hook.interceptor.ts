import {
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
import { HookDTO } from './dto/hook.dto';
import { Repository } from 'typeorm';
import { memoize } from 'src/app.util';
import { ResourceBaseInterceptorOptions } from 'src/app.interfaces';

const createHookInterceptor = ({
    sources = 'query',
    paths = '$.hook_id',
    type = -1,
    checkDeviceId = false,
}: ResourceBaseInterceptorOptions) => {
    class MixinHookInterceptor implements NestInterceptor {
        public constructor(
        @Inject(ClientService)
        private readonly clientService: ClientService,
        @Inject(UtilService)
        private readonly utilService: UtilService,
        @InjectRepository(HookDTO)
        private readonly hookRepository: Repository<HookDTO>,
        ) {}

        public async intercept(
            context: ExecutionContext,
            next: CallHandler,
        ): Promise<Observable<any>> {
            const request = context.switchToHttp().getRequest();
            const userId = _.get(request, 'user.id');
            const hookId = this.utilService.getResourceIdentityFromContext(context, sources, paths);

            if (!hookId) {
                return next.handle();
            }

            const hook = await this.hookRepository.findOne({
                where: {
                    id: hookId,
                },
                relations: ['client'],
            });

            if (!hook) {
                return next.handle();
            }

            const clientId = _.get(hook, 'client.id');

            if (
                _.isString(clientId) &&
                !(await this.clientService.checkPermission({ userId, clientId, permission: type, checkDeviceId }))
            ) {
                throw new ForbiddenException();
            }

            return next.handle();
        }
    }

    const interceptor = mixin(MixinHookInterceptor);
    return interceptor;
};

export const HookInterceptor: (
    options: ResourceBaseInterceptorOptions,
) => NestInterceptor = memoize(createHookInterceptor);
