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
            async (apiKey, done) => {
                try {
                    const user = await this.keyService.validateApiKey(apiKey);
                    if (!user) {
                        return done(null, false);
                    } else {
                        return done(null, user);
                    }
                } catch (error) {
                    return done(error);
                }
            },
        );
    }
}
