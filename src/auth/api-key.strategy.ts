import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { KeyService } from 'src/key/key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
    public constructor(
        private readonly keyService: KeyService,
    ) {
        super(
            {
                header: 'X-PB-API-KEY',
                prefix: '',
            },
            true,
            async (apiKey, done) => {
                try {
                    const user = await keyService.validateApiKey(apiKey);
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
