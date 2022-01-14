import {
    Injectable,
    PipeTransform,
} from '@nestjs/common';

@Injectable()
export class PermanentlyParseInt implements PipeTransform {
    public transform(value: any) {
        if (!value) {
            return null;
        }

        try {
            return parseInt(value, 10);
        } catch (e) {
            return null;
        }
    }
}
