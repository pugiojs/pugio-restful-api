import * as _ from 'lodash';
import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserDTO } from '../user/dto/user.dto';
import { ClientDTO } from 'src/client/dto/client.dto';

export const CurrentClient = createParamDecorator(
    (data: string, context: ExecutionContext): ClientDTO => {
        const user = context.switchToHttp().getRequest().user;

        if (!user) {
            return null;
        }

        const userData = (data ? user[data] : user) as UserDTO & { client: ClientDTO };

        return _.get(userData, 'client');
    },
);
