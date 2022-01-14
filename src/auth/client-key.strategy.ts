import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { KeyService } from 'src/key/key.service';

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

                    if (!user || !client) {
                        return done(null, false);
                    } else {
                        return done(null, { ...user, client });
                    }
                } catch (error) {
                    return done(error);
                }
            },
        );
    }
}
