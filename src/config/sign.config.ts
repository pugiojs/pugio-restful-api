import { registerAs } from '@nestjs/config';
import * as path from 'path';

export default registerAs('sign', () => {
    const publicKeyFilename = process.env.SIGN_PUBLIC_KEY_FILENAME;
    const privateKeyFilename = process.env.SIGN_PRIVATE_KEY_FILENAME;
    const directory = process.env.SIGN_DIRECTORY;
    const keyPairPathname = path.resolve(__dirname, '../..', directory);

    return {
        directory: process.env.SIGN_DIRECTORY,
        keyPairPathname,
        publicKeyFilename,
        privateKeyFilename,
        publicKeyPathname: path.resolve(keyPairPathname, publicKeyFilename),
        privateKeyPathname: path.resolve(keyPairPathname, privateKeyFilename),
        passphrase: process.env.SIGN_PASSPHRASE,
        issuer: process.env.SIGN_ISSUER,
    };
});
