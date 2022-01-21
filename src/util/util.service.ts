import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import {
    NestedConditionList,
    PaginationQueryOptions,
    PaginationQueryResponse,
    TRangeItem,
    TRangeMap,
    WhereOptions,
} from 'src/app.interfaces';
import { UserDAO } from 'src/user/dao/user.dao';
import {
    Between,
    LessThan,
    Like,
    MoreThan,
} from 'typeorm';
import { v5 as uuidv5 } from 'uuid';

type DataType = Array<any> | Object | string | Date;
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

    public transformCaseStyle = <T extends DataType, R extends T | DataType>(
        data: Partial<T>,
        targetCaseStyleType: CaseStyleType,
    ): R => {
        if (_.isNumber(data) && data === 0) {
            return data as any;
        }

        if (!data) {
            return;
        }

        if (_.isDate(data)) {
            return data as R;
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

    public async sleep(timeout = 500) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(undefined);
            }, timeout);
        });
    }

    public generateExecutionTaskChannelName(clientId: string) {
        return `${clientId}@execution`;
    }

    public generateExecutionTaskQueueName(clientId: string) {
        return `${clientId}:task_queue`;
    }

    public generateExecutionTaskLockName(clientId: string) {
        return `${clientId}:task_queue_lock`;
    }

    public async queryWithPagination<D>(
        {
            repository,
            whereOptions: userWhereOptions = {},
            size = 10,
            searchContent = '',
            searchKeys: userSearchKeys = [],
            range = {},
            lastCursor = '',
        }: PaginationQueryOptions<D>,
    ): Promise<PaginationQueryResponse<D>> {
        const searchKeys = Array.from(userSearchKeys);
        let rangeMapList: TRangeMap<D>[] = [];
        let cursorDate: Date;

        if (_.isArray(range)) {
            rangeMapList = range;
        } else {
            rangeMapList = [range];
        }

        if (lastCursor) {
            const cursorItem: any = await repository.findOne({
                where: {
                    id: lastCursor,
                },
            });

            if (cursorItem) {
                cursorDate = cursorItem.createdAt as Date;
            }
        }

        const baseWhereConditionList = (searchContent && _.isString(searchContent))
            ? searchKeys.map((searchKey) => {
                return _.merge(
                    _.cloneDeep(userWhereOptions),
                    (
                        searchKey !== '@sys_nil@'
                            ? {
                                [searchKey]: Like(`%${searchContent}%`),
                            }
                            : {}
                    ),
                );
            })
            : [_.cloneDeep(userWhereOptions)];

        const whereNestedConditionList = baseWhereConditionList.reduce((resultList: WhereOptions<D>[], condition) => {
            const currentResultList = Array.from(resultList);

            const currentItem = rangeMapList
                .map((rangeMap) => {
                    const currentCondition = _.merge(
                        condition,
                        (
                            _.isDate(cursorDate)
                                ? {
                                    createdAt: LessThan(cursorDate),
                                }
                                : {}
                        ),
                        this.parseRange<D>(rangeMap, cursorDate, false),
                    );

                    return _.isDate(cursorDate)
                        ? [
                            currentCondition,
                            {
                                createdAt: cursorDate,
                                id: LessThan(lastCursor),
                            },
                        ]
                        : currentCondition;
                });

            currentResultList.push((currentItem.length === 1 ? currentItem[0] : currentItem));

            return currentResultList;
        }, [] as WhereOptions<D>[]) as NestedConditionList<D>;

        const whereConditionList = this.flatWhereCondition(whereNestedConditionList);

        const whereCondition = whereConditionList.length === 1
            ? whereConditionList[0]
            : whereConditionList;

        const [total = 0, items = []] = await Promise.all([
            repository.count({
                where: whereCondition,
            }),
            repository.find({
                where: whereCondition,
                take: size,
                order: {
                    createdAt: 'DESC',
                    id: 'DESC',
                } as any,
            }),
        ]);

        return {
            items,
            remains: Math.max(total - size, 0),
            size,
            lastCursor,
            timestamp: cursorDate,
        };
    }

    public async generateRandomPassword(namespace?: string) {
        const seed = [
            Math.random().toString(32).slice(2),
            Date.now().toString(),
            ...(
                _.isString(namespace)
                    ? [namespace]
                    : []
            ),
        ];

        let passwordContent = seed.join(':');

        if (_.isString(namespace)) {
            try {
                passwordContent = uuidv5(passwordContent, namespace);
            } catch (e) {}
        }

        return Buffer.from(passwordContent).toString('base64');
    }

    private generateCreatedAtRange(dateRange: Date[], cursorDate: Date) {
        if (
            !_.isArray(dateRange) ||
            dateRange.length !== 2 ||
            dateRange.some((rangeItem) => !_.isDate(rangeItem) && !_.isNull(rangeItem))
        ) {
            return null;
        }

        const [minDate, maxDate] = dateRange;

        if (!_.isDate(cursorDate)) {
            return {
                min: minDate,
                max: maxDate,
            };
        }

        if (minDate && maxDate) {
            if (cursorDate <= minDate) {
                return null;
            }

            return {
                min: minDate,
                max: _.min([maxDate, cursorDate]),
            };
        } else if (!minDate && maxDate) {
            return {
                min: null,
                max: _.min([maxDate, cursorDate]),
            };
        } else if (minDate && !maxDate) {
            if (cursorDate <= minDate) {
                return null;
            }

            return {
                min: minDate,
                max: cursorDate,
            };
        } else {
            return {
                min: null,
                max: cursorDate,
            };
        }
    }

    private generateORMRangeQuery(range: TRangeItem[]) {
        if (!_.isArray(range) || range.length !== 2) {
            return null;
        }

        const [minValue, maxValue] = range;

        if (minValue && maxValue) {
            return Between(minValue, maxValue);
        } else if (!minValue && maxValue) {
            return LessThan(maxValue);
        } else if (minValue && !maxValue) {
            return MoreThan(minValue);
        } else {
            return null;
        }
    }

    private parseRange<D>(rangeMap: TRangeMap<D>, cursorDate?: Date, countMode = false) {
        if (!rangeMap || !_.isObject(rangeMap) || Object.keys(rangeMap).length === 0) {
            return {};
        }

        return Object.keys(rangeMap).reduce((result, key) => {
            let currentRange;

            if (!countMode && key === 'createdAt') {
                const result = this.generateCreatedAtRange(rangeMap[key], cursorDate);

                if (result) {
                    currentRange = this.generateORMRangeQuery([result.min, result.max]);
                }
            } else {
                currentRange = this.generateORMRangeQuery(rangeMap[key]);
            }

            if (currentRange) {
                result[key] = currentRange;
            }

            return result;
        }, {});
    }

    private flatWhereCondition<D>(conditionList: NestedConditionList<D>): TRangeMap<D>[] {
        let result: TRangeMap<D>[] = [];

        for (const conditionListItem of conditionList) {
            if (!_.isArray(conditionListItem)) {
                result.push(conditionListItem);
            } else {
                result = result.concat(this.flatWhereCondition(conditionListItem));
            }
        }

        return result;
    }
}
