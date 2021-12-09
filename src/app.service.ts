import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import { generateKeyPairSync } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
    public constructor(
        private readonly configService: ConfigService,
    ) {}

    public createKeyPair() {
        const {
            passphrase,
            keyPairPathname,
            publicKeyPathname,
            privateKeyPathname,
        } = this.configService.get('sign');

        const {
            publicKey,
            privateKey,
        } = generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase,
            },
        });

        if (!fs.existsSync(keyPairPathname)) {
            fs.mkdirpSync(keyPairPathname);
        }

        if (!fs.existsSync(publicKeyPathname) || !fs.existsSync(privateKeyPathname)) {
            fs.writeFileSync(publicKeyPathname, publicKey);
            fs.writeFileSync(privateKeyPathname, privateKey);
        }
    }
}
