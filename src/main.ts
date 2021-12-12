import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import getSignConfig from './config/sign.config';
import { generateKeyPairSync } from 'crypto';
import * as fs from 'fs-extra';

const createKeyPair = (signConfig: ReturnType<typeof getSignConfig>) => {
    const {
        keyPairPathname,
        publicKeyPathname,
        privateKeyPathname,
    } = signConfig;

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
        },
    });

    if (!fs.existsSync(keyPairPathname)) {
        fs.mkdirpSync(keyPairPathname);
    }

    if (!fs.existsSync(publicKeyPathname) || !fs.existsSync(privateKeyPathname)) {
        fs.writeFileSync(publicKeyPathname, publicKey);
        fs.writeFileSync(privateKeyPathname, privateKey);
    }
};

async function bootstrap() {
    createKeyPair(getSignConfig());
    const app = await NestFactory.create(AppModule);
    const configService = app.get<ConfigService>(ConfigService);
    app.setGlobalPrefix('/api/v1');
    await app.listen(
        configService.get<number>('app.port'),
        configService.get<string>('app.host'),
    );
}
bootstrap();
