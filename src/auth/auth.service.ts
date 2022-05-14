import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as _ from 'lodash';
import { KeyService } from 'src/key/key.service';
import axios from 'axios';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
    public constructor(
        public readonly keyService: KeyService,
        public readonly configService: ConfigService,
        public readonly userService: UserService,
    ) {}

    public checkSocketGatewayPermission(token = '', type = ''): Promise<string> {
        return new Promise((resolve, reject) => {
            switch (type.toLocaleLowerCase()) {
                case 'ak': {
                    this.keyService.validateApiKey(token, ['socket'], 'all')
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
}
