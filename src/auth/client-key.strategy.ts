import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import {
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { KeyService } from 'src/key/key.service';
import * as _ from 'lodash';

@Injectable()
export class ClientKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'client-key') {
    public constructor(
        private readonly keyService: KeyService,
    ) {
        super(
            {
                header: 'CLIENT-KEY',
                prefix: '',
            },
            true,
            async (encodedClientKey, done) => {
                try {
                    const {
                        user,
                        client,
                    } = await this.keyService.validateClientKey(encodedClientKey);

                    if (!user) {
                        return done(null, _.isUndefined(user) ? new ForbiddenException() : false);
                    } else {
                        if (!client) {
                            return done(new ForbiddenException());
                        } else {
                            return done(null, {
                                ...user,
                                $client: client,
                            });
                        }
                    }
                } catch (error) {
                    return done(error);
                }
            },
        );
    }
}
