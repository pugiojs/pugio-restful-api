import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDTO } from './dto/user.dto';

export const CurrentUser = createParamDecorator(
    (data: string, context: ExecutionContext): UserDTO => {
        const user = context.switchToHttp().getRequest().user;

        if (!user) {
            return null;
        }

        return (data ? user[data] : user) as UserDTO;
    },
);
