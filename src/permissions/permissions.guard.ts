import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as _ from 'lodash';

@Injectable()
export class PermissionsGuard implements CanActivate {
    public constructor(private readonly reflector: Reflector) {}

    public canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const routePermissions = this.reflector.get<string[]>(
            'permissions',
            context.getHandler(),
        );

        if (!routePermissions || !_.isArray(routePermissions) || routePermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const userPermissions = _.get(request, 'user.permissions') || [];

        const hasPermission = () => {
            return routePermissions.some(routePermission => {
                return userPermissions.includes(routePermission);
            });
        }

        return hasPermission();
    }
}
