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
import { memoize } from 'src/app.util';
import { ResourceBaseInterceptorOptions } from 'src/app.interfaces';

const createClientInterceptor = ({
    type = -1,
    sources = 'query',
    paths = '$.client_id',
}: ResourceBaseInterceptorOptions) => {
    class MixinClientInterceptor implements NestInterceptor {
        public constructor(
            @Inject(ClientService)
            private readonly clientService: ClientService,
            @Inject(UtilService)
            private readonly utilService: UtilService,
        ) {}

        public async intercept(
            context: ExecutionContext,
            next: CallHandler,
        ): Promise<Observable<any>> {
            const request = context.switchToHttp().getRequest();
            const userId = _.get(request, 'user.id');
            const clientId = this.utilService.getResourceIdentityFromContext(context, sources, paths);

            if (
                _.isString(clientId) &&
                !(await this.clientService.checkPermission({ userId, clientId, permission: type }))
            ) {
                throw new ForbiddenException();
            }

            return next.handle();
        }
    }

    const interceptor = mixin(MixinClientInterceptor);
    return interceptor;
};

export const ClientInterceptor: (
    options: ResourceBaseInterceptorOptions,
) => NestInterceptor = memoize(createClientInterceptor);
