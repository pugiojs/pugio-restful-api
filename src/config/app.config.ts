import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    port: process.env.APP_PORT ?? 3000,
    host: process.env.APP_HOST ?? '0.0.0.0',
    origin: process.env.APP_ORIGIN ?? 'account.lenconda.top',
}));
