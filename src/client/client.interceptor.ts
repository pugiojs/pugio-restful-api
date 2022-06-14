import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Logger,
    mixin,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UtilService } from 'src/util/util.service';
import * as _ from 'lodash';
import { memoize } from 'src/app.util';
import { ResourceBaseInterceptorOptions } from 'src/app.interfaces';
import { AuthService } from 'src/auth/auth.service';

const createClientInterceptor = ({
    type = -1,
    sources = 'query',
    paths = '$.client_id',
}: ResourceBaseInterceptorOptions) => {
    class MixinClientInterceptor implements NestInterceptor {
        private readonly logger = new Logger('ClientInterceptor');

        public constructor(
            @Inject(UtilService)
            private readonly utilService: UtilService,
            private readonly authService: AuthService,
        ) {}

        public async intercept(
            context: ExecutionContext,
            next: CallHandler,
        ): Promise<Observable<any>> {
            const request = context.switchToHttp().getRequest();
            const userId = _.get(request, 'user.id');
            const clientId = this.utilService.getResourceIdentityFromContext(context, sources, paths);

            this.logger.log('Checking client permission: ' + JSON.stringify({ userId, clientId, type }));

            if (
                _.isString(clientId) &&
                !(await this.authService.checkPermission({ userId, clientId, permission: type }))
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
