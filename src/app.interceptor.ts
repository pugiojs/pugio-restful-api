import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import * as _ from 'lodash';
import { Observable } from 'rxjs';
import {
    catchError,
    map,
} from 'rxjs/operators';
import { ERR_HTTP_SERVER_ERROR } from './app.constants';
import { UtilService } from './util/util.service';

export type Response = Record<string, any>;

@Injectable()
export class AppInterceptor<T> implements NestInterceptor<T, Response> {
    private logger = new Logger('AppInterceptor');

    public constructor(
        private readonly utilService: UtilService,
    ) {}

    public async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<Response>> {
        return next.handle().pipe(
            catchError((e) => {
                this.logger.warn(e);
                if (e instanceof HttpException) {
                    throw e;
                } else {
                    throw new InternalServerErrorException(ERR_HTTP_SERVER_ERROR, e.message || e.toString());
                }
            }),
            map((data) => {
                return this.utilService.transformDTOToDAO(data);
            }),
        );
    }
}
