import * as _ from 'lodash';
import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserDTO } from '../user/dto/user.dto';
import { ClientDTO } from 'src/client/dto/client.dto';

export const CurrentClient = createParamDecorator(
    (data: string, context: ExecutionContext): ClientDTO => {
        const client = _.get(context.switchToHttp().getRequest(), 'user.$client');

        if (!client) {
            return null;
        }

        const clientData = (data ? client[data] : client) as ClientDTO;

        return clientData;
    },
);
