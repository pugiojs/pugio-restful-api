import {
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as _ from 'lodash';
import { KeyService } from 'src/key/key.service';
import axios from 'axios';
import { UserService } from 'src/user/user.service';
import {
    ERR_CLIENT_UNVERIFIED,
    ERR_CLIENT_VERSION_NOT_SUPPORT,
} from 'src/app.constants';
import * as semver from 'semver';
import { InjectRepository } from '@nestjs/typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
    private readonly logger = new Logger('AuthService');

    public constructor(
        private readonly keyService: KeyService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
    ) {}

    public checkSocketGatewayPermission(token = '', type = ''): Promise<string> {
        return new Promise((resolve, reject) => {
            switch (type.toLocaleLowerCase()) {
                case 'ak': {
                    this.keyService.validateApiKey(token)
                        .then((user) => {
                            if (_.isString(user?.id)) {
                                resolve(user.id);
                            } else {
                                reject(new Error());
                            }
                        })
                        .catch(() => reject(new Error()));
                    break;
                }
                case 'ck': {
                    this.keyService.validateClientKey(token)
                        .then(({ user }) => {
                            if (_.isString(user?.id)) {
                                resolve(user.id);
                            } else {
                                reject(new Error());
                            }
                        })
                        .catch(() => reject(new Error()));
                    break;
                }
                case 'bearer': {
                    const audience = this.configService.get<string>('auth.audience');
                    const accountCenterApi = this.configService.get<string>('auth.accountCenterApi');
                    axios.post(
                        `${accountCenterApi}/oauth2/validate`, {
                            token,
                            audience,
                        },
                        {
                            responseType: 'json',
                        },
                    ).then((res) => {
                        if (!res?.data?.sub) {
                            return Promise.reject(new Error());
                        }

                        return this.userService.getUserInformation({ openId: res.data.sub });
                    }).then((user) => {
                        if (user) {
                            resolve(user.id);
                        } else {
                            reject(new Error());
                        }
                    }).catch(() => {
                        reject(new Error());
                    });
                    break;
                }
                default:
                    break;
            }
        });
    }

    public async checkPermission(
        {
            userId,
            clientId,
            permission = -1,
            checkDeviceId = false,
            version = [],
        }: {
            userId?: string,
            clientId: string,
            permission?: number | number[],
            checkDeviceId?: boolean,
            version?: string | string[],
        },
    ) {
        this.logger.log(JSON.stringify({ userId, clientId, permission, checkDeviceId, version }));

        if (!_.isString(userId) || !userId) {
            return true;
        }

        const relations = await this.userClientRepository
            .find({
                where: {
                    user: {
                        id: userId,
                    },
                    client: {
                        id: clientId,
                    },
                },
                relations: ['client'],
            });

        if (relations.length === 0) {
            this.logger.warn('Cannot find relations as user: ' + userId + ' and client: ' + clientId);
            return false;
        }

        if (
            checkDeviceId &&
            relations.some((relation) => !relation.client.verified)
        ) {
            this.logger.warn('Current client is not verified');
            throw new ForbiddenException(ERR_CLIENT_UNVERIFIED);
        }

        if (_.isString(version) || (_.isArray(version) && version.length > 0)) {
            let compareType: string;
            let minVersion: string;
            let maxVersion: string;
            let canUse = true;

            if (_.isString(version)) {
                compareType = 'gte';
                minVersion = version;
            } else if (_.isArray(version)) {
                const [min, max] = version;
                if (_.isString(min) && _.isString(max)) {
                    compareType = 'between';
                    minVersion = min;
                    maxVersion = max;
                } else if (_.isString(min) && !_.isString(max)) {
                    compareType = 'gte';
                    minVersion = min;
                } else if (!_.isString(min) && _.isString(max)) {
                    compareType = 'lte';
                    maxVersion = max;
                }
            }

            if (!compareType) {
                return canUse;
            }

            canUse = relations.some((relation) => {
                const clientVersion = relation.client.version;

                switch (compareType) {
                    case 'gte': {
                        return semver.gte(clientVersion, minVersion);
                    }
                    case 'lte': {
                        return semver.lte(clientVersion, maxVersion);
                    }
                    case 'between': {
                        return semver.gte(clientVersion, minVersion) && semver.lte(clientVersion, maxVersion);
                    }
                    default: {
                        return true;
                    }
                }
            });

            if (!canUse) {
                this.logger.warn('Cannot use this function in current version: ' + relations[0].client.version + ' clientId: ' + clientId);
                throw new ForbiddenException(ERR_CLIENT_VERSION_NOT_SUPPORT);
            }
        }

        if (permission === -1) {
            return true;
        }

        const permissionList = _.isNumber(permission)
            ? [permission]
            : permission;

        this.logger.log('Checking permission for client ' + clientId + ', permissions: ' + permissionList + ' roleType: ' + relations.map((relation) => relation.roleType));

        return relations.some((relation) => permissionList.indexOf(relation.roleType) !== -1);
    }
}
