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
import { ClientService } from '../client/client.service';
import * as _ from 'lodash';
import { InjectRepository } from '@nestjs/typeorm';
import { HookDTO } from './dto/hook.dto';
import { Repository } from 'typeorm';

@Injectable()
export class HookInterceptor implements NestInterceptor {
    public constructor(
        @Inject(ClientService)
        private readonly clientService: ClientService,
        @Inject(UtilService)
        private readonly utilService: UtilService,
        @InjectRepository(HookDTO)
        private readonly hookRepository: Repository<HookDTO>,
    ) {}

    public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const userId = _.get(request, 'user.id');

        let hookId: string =
            _.get(request, 'params.hook_id') ||
            _.get(request, 'query.hook');

        if (!hookId) {
            return next.handle();
        }

        const hook = await this.hookRepository.findOne({
            where: {
                id: hookId,
            },
            select: ['client'],
        });

        if (!hook) {
            return next.handle();
        }

        const clientId = _.get(hook, 'client.id');

        if (_.isString(clientId) && !(await this.clientService.checkPermission(userId, clientId))) {
            throw new ForbiddenException();
        }

        return next.handle();
    }
}
