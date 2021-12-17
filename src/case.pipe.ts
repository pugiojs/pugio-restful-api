import {
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import { UtilService } from './util/util.service';

@Injectable()
export class CamelCasePipe implements PipeTransform {
    public constructor(
        private readonly utilService: UtilService,
    ) {}

    public transform(value: any) {
        const newValue = this.utilService.transformCaseStyle(value, 'camel');
        return newValue;
    }
}
