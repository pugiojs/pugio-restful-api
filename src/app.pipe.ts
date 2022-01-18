import {
    Injectable,
    PipeTransform,
} from '@nestjs/common';

@Injectable()
export class PermanentlyParseIntPipe implements PipeTransform {
    public transform(value: any) {
        if (!value) {
            return undefined;
        }

        try {
            return parseInt(value, 10);
        } catch (e) {
            return undefined;
        }
    }
}
