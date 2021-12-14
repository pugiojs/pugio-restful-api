import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import { UserDAO } from 'src/user/dao/user.dao';
import * as JwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import {
    ERR_SIGN_KEY_NOT_FOUND,
} from 'src/app.constants';
import * as fs from 'fs-extra';

type DataType = Array<any> | Object | string;
type CaseStyleType = 'snake' | 'camel' | 'kebab';

@Injectable()
export class UtilService {
    private userDAOKeyMap = {
        name: 'name',
        nickname: 'nickname',
        picture: 'picture',
        user_id: 'open_id',
        email: 'email',
        created_at: 'created_at',
        updated_at: 'updated_at',
    };

    public constructor(
        private readonly configService: ConfigService,
    ) {}

    public transformCaseStyle = <T extends DataType, R extends T | DataType>(data: Partial<T>, targetCaseStyleType: CaseStyleType): R => {
        if (!_.isNumber(data) && !data) {
            return;
        }

        if (_.isArray(data)) {
            return data.map((currentArrayItem) => {
                if (_.isObject(currentArrayItem) || _.isObjectLike(currentArrayItem)) {
                    return this.transformCaseStyle(currentArrayItem, targetCaseStyleType);
                } else if (_.isArray(currentArrayItem)) {
                    return this.transformCaseStyle(currentArrayItem, targetCaseStyleType);
                } else {
                    return currentArrayItem;
                }
            }) as R;
        }

        if (_.isObject(data) || _.isObjectLike(data)) {
            return Object.keys(data).reduce((result, legacyKeyName) => {
                let currentKeyName: string;

                switch (targetCaseStyleType) {
                    case 'camel': {
                        currentKeyName = _.camelCase(legacyKeyName);
                        break;
                    }
                    case 'kebab': {
                        currentKeyName = _.kebabCase(legacyKeyName);
                        break;
                    }
                    case 'snake': {
                        currentKeyName = _.snakeCase(legacyKeyName);
                        break;
                    }
                    default:
                        currentKeyName = legacyKeyName;
                        break;
                }

                result[currentKeyName] = this.transformCaseStyle(data[legacyKeyName], targetCaseStyleType);

                return result;
            }, {} as R);
        }

        if (_.isPlainObject(data) || _.isString(data)) {
            return _.cloneDeep<R>(data as R);
        }

        return data;
    };

    public transformDAOToDTO<DAOType, DTOType>(daoData: Partial<DAOType>): DTOType {
        return this.transformCaseStyle<DAOType, DTOType>(daoData, 'camel');
    }

    public transformDTOToDAO<DTOType, DAOType>(dtoData: Partial<DTOType>): DAOType {
        return this.transformCaseStyle<DTOType, DAOType>(dtoData, 'snake');
    }

    public getUserDAOFromAuth0Response(userInfo: Object) {
        return Object.keys(this.userDAOKeyMap).reduce((result, currentKey) => {
            const currentKeyName = this.userDAOKeyMap[currentKey];
            const currentValue = userInfo[currentKey];
            if (!_.isNull(currentValue) || !_.isUndefined(currentValue)) {
                result[currentKeyName] = currentValue;
            }
            return result;
        }, {} as UserDAO);
    }

    public async validateAuth0AccessToken(token: string, audience: string): Promise<jwt.JwtPayload> {
        return new Promise((resolve, reject) => {
            const jwksClient = JwksClient({
                rateLimit: true,
                cache: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${this.configService.get('auth.domain')}/.well-known/jwks.json`,
            });

            jwt.verify(
                token,
                (header, callback) => {
                    jwksClient.getSigningKey(header.kid, (error, key) => {
                        if (error) {
                            reject(error);
                        }

                        const signingKey = key.getPublicKey();

                        if (!signingKey) {
                            reject(new Error(ERR_SIGN_KEY_NOT_FOUND));
                        }

                        callback(error, signingKey);
                    });
                },
                {
                    audience,
                    algorithms: ['RS256'],
                    issuer: `https://${this.configService.get('auth.domain')}/`,
                },
                (error, payload) => {
                    if (error) {
                        reject(error);
                    }

                    resolve(payload);
                },
            );
        });
    }

    public signAccountCenterToken(openId: string) {
        const privateKey = fs.readFileSync(this.configService.get('sign.privateKeyPathname'));

        if (!openId || !privateKey) {
            return null;
        }

        const token = jwt.sign(
            {
                sub: openId,
            },
            privateKey,
            {
                algorithm: 'RS256',
                audience: this.configService.get('auth.audience'),
                expiresIn: this.configService.get('sign.expiration'),
                issuer: this.configService.get('sign.issuer'),
            },
        );

        return token;
    }
}
