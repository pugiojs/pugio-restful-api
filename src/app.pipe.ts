import {
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import * as _ from 'lodash';
import { UtilService } from './util/util.service';

@Injectable()
export class PermanentlyParseIntPipe implements PipeTransform {
    public transform(value: any) {
        const permanentParseInt = (value: any) => {
            if (_.isNull(value) || _.isUndefined(value)) {
                return undefined;
            }

            try {
                return parseInt(value, 10);
            } catch (e) {
                return undefined;
            }
        };

        if (_.isNumber(value)) {
            return value;
        }

        if (_.isString(value)) {
            return permanentParseInt(value);
        }

        if (_.isArray(value)) {
            return value
                .map((item) => permanentParseInt(item))
                .filter((item) => _.isNumber(item));
        }

        return undefined;
    }
}

@Injectable()
export class ParseTimestampPipe implements PipeTransform {
    public transform(value: any) {
        try {
            const date = new Date(value);

            if (!_.isDate(date) || date.toString() === 'Invalid Date') {
                return null;
            }

            return date;
        } catch (e) {
            return null;
        }
    }
}

@Injectable()
export class ParseDateRangePipe implements PipeTransform {
    public transform(value: any) {
        if (!_.isString(value)) {
            return [null, null];
        }

        const [minDateString, maxDateString] = value.split('--');

        try {
            const result = [];
            const minDate = new Date(minDateString);
            const maxDate = new Date(maxDateString);

            if (!_.isDate(minDate) || minDate.toString() === 'Invalid Date') {
                result.push(null);
            }

            if (!_.isDate(maxDate) || maxDate.toString() === 'Invalid Date') {
                result.push(null);
            }

            result.push(minDate);
            result.push(maxDate);

            return result;
        } catch (e) {
            return [null, null];
        }
    }
}


@Injectable()
export class ParseNumberRangePipe implements PipeTransform {
    public transform(value: any) {
        if (!_.isString(value)) {
            return [null, null];
        }

        const [minString, maxString] = value.split('--');

        try {
            const result = [];
            const minNumber = parseInt(minString, 10);
            const maxNumber = parseInt(maxString, 10);

            if (!_.isNumber(minNumber) || _.isNaN(minNumber)) {
                result.push(null);
            }

            if (!_.isNumber(maxNumber) || _.isNaN(maxNumber)) {
                result.push(null);
            }

            result.push(minNumber);
            result.push(maxNumber);

            return result;
        } catch (e) {
            return [null, null];
        }
    }
}

@Injectable()
export class ParseQueryArrayPipe implements PipeTransform {
    public transform(value: any) {
        if (!value || !_.isString(value)) {
            return [];
        }

        return value.split(',');
    }
}

@Injectable()
export class TransformDTOPipe implements PipeTransform {
    public constructor(
        private readonly utilService: UtilService,
    ) {}

    public transform(value: any) {
        if (!value) {
            return {};
        }

        return this.utilService.transformDAOToDTO(value);
    }
}

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
    public transform(value: any) {
        if (!value || value === 'false' || value === '0') {
            return false;
        }

        return true;
    }
}
