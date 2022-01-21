import {
    CallHandler,
    ExecutionContext,
    ForbiddenException,
    Inject,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UtilService } from 'src/util/util.service';
import { ClientService } from './client.service';
import * as _ from 'lodash';

@Injectable()
export class ClientInterceptor implements NestInterceptor {
    public constructor(
        @Inject(ClientService)
        private readonly clientService: ClientService,
        @Inject(UtilService)
        private readonly utilService: UtilService,
    ) {}

    public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const userId = _.get(request, 'user.id');

        let clientId: string =
            _.get(request, 'params.client_id') ||
            _.get(request, 'query.client');

        console.log(clientId, userId);

        if (_.isString(clientId) && !(await this.clientService.checkPermission(userId, clientId))) {
            throw new ForbiddenException();
        }

        return next.handle();
    }
}
