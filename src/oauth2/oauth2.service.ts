import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as JwksClient from 'jwks-rsa';
import {
    ERR_SIGN_KEY_NOT_FOUND,
} from 'src/app.constants';
import { FusionAuthClient } from '@fusionauth/typescript-client';

@Injectable()
export class Oauth2Service {
    private client: FusionAuthClient;

    public constructor(
        private readonly configService: ConfigService,
    ) {
        this.client = new FusionAuthClient(
            this.configService.get('auth.clientId'),
            `https://${this.configService.get('auth.domain')}`,
        );
    }

    public getClient() {
        return this.client;
    }

    public async validateOauth2AccessToken(token: string, audience: string): Promise<jwt.JwtPayload> {
        return new Promise((resolve, reject) => {
            const jwksClient = JwksClient({
                rateLimit: true,
                cache: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${this.configService.get('auth.domain')}/.well-known/jwks.json`,
            });

            jwt.verify(
                token,
                (header, callback) => {
                    jwksClient.getSigningKey(header.kid, (error, key) => {
                        if (error) {
                            reject(error);
                        }

                        const signingKey = key.getPublicKey();

                        if (!signingKey) {
                            reject(new Error(ERR_SIGN_KEY_NOT_FOUND));
                        }

                        callback(error, signingKey);
                    });
                },
                {
                    audience,
                    algorithms: ['RS256'],
                    issuer: `https://${this.configService.get('auth.domain')}/`,
                },
                (error, payload) => {
                    if (error) {
                        reject(error);
                    }

                    resolve(payload);
                },
            );
        });
    }
}
