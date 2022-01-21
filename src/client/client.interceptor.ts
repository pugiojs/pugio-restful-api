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

const createClientInterceptor = (type?: number | number[]) => {
    class MixinClientInterceptor implements NestInterceptor {
        public constructor(
        @Inject(ClientService)
        private readonly clientService: ClientService,
        @Inject(UtilService)
        private readonly utilService: UtilService,
        ) {}

        public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
            const request = context.switchToHttp().getRequest();
            const userId = _.get(request, 'user.id');

            let clientId: string = _.get(request, 'params.client_id') ||
                _.get(request, 'query.client') ||
                this.utilService.getStringValueFromBody(_.get(request, 'body'), 'client');

            if (
                _.isString(clientId) &&
                !(await this.clientService.checkPermission(userId, clientId, type))
            ) {
                throw new ForbiddenException();
            }

            return next.handle();
        }
    }

    const interceptor = mixin(MixinClientInterceptor);
    return interceptor;
};

export const ClientInterceptor: (type?: number | number[]) => NestInterceptor = memoize(createClientInterceptor);
