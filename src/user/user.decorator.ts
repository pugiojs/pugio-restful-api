import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserDTO } from './dto/user.dto';
import * as _ from 'lodash';
import { ClientDTO } from 'src/client/dto/client.dto';

export const CurrentUser = createParamDecorator(
    (data: string, context: ExecutionContext): UserDTO => {
        const user = context.switchToHttp().getRequest().user;

        if (!user) {
            return null;
        }

        const userData = (data ? user[data] : user) as UserDTO & { client: ClientDTO };

        return _.omit(userData, ['client']);
    },
);
