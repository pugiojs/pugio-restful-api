import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import {
    // CursorQueryOptions,
    // CursorQueryResponse,
    PaginationQueryOptions,
    PaginationQueryResponse,
    TRangeItem,
    TRangeMap,
} from 'src/app.interfaces';
import { UserDAO } from 'src/user/dao/user.dao';
import {
    Between,
    LessThan,
    LessThanOrEqual,
    Like,
    MoreThan,
} from 'typeorm';

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
            page = 1,
            size = 10,
            searchContent = '',
            searchKeys: userSearchKeys = [],
            range = {},
            timestamp = -1,
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

        if (timestamp > 0) {
            cursorDate = new Date(timestamp);
        }

        const baseWhereConditionList = searchKeys.map((searchKey) => {
            return _.merge(
                _.cloneDeep(userWhereOptions),
                (
                    (searchKey !== '@sys_nil@' && searchContent && _.isString(searchContent))
                        ? {
                            [searchKey]: Like(`%${searchContent}%`),
                        }
                        : {}
                ),
            );
        });

        console.log('222', baseWhereConditionList);

        const whereConditionList = baseWhereConditionList.reduce((resultList, condition) => {
            const currentResultList = _.cloneDeep(resultList);

            Object.keys(currentResultList).forEach((listName) => {
                currentResultList[listName] = currentResultList[listName].concat(
                    rangeMapList
                        .map((rangeMap) => {
                            return _.merge(
                                condition,
                                (
                                    (listName === 'items' && _.isDate(cursorDate))
                                        ? {
                                            createdAt: LessThan(cursorDate),
                                        }
                                        : {}
                                ),
                                this.parseRange<D>(rangeMap, cursorDate, listName === 'count'),
                            );
                        })
                        .filter((query) => Boolean(query)),
                );
            });

            console.log('333', currentResultList.items);

            return currentResultList;
        }, {
            items: [],
            count: [],
        });

        const [total = 0, items = []] = await Promise.all([
            repository.count({
                where: whereConditionList.count,
            }),
            repository.find({
                where: whereConditionList.items,
                take: size,
                order: {
                    createdAt: 'DESC',
                    id: 'DESC',
                } as any,
                skip: (page - 1) * size,
            }),
        ]);

        return {
            items,
            total,
            page,
            size,
        };
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

            console.log('111', currentRange);

            return result;
        }, {});
    }
}
