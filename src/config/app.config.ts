import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    port: process.env.APP_PORT
        ? parseInt(process.env.APP_PORT, 10)
        : 3000,
    host: process.env.APP_HOST ?? '0.0.0.0',
    redisHost: process.env.APP_REDIS_HOST,
    lockerExpiration: process.env.APP_LOCKER_EXPIRATION
        ? parseInt(process.env.APP_LOCKER_EXPIRATION, 10)
        : 30,
    defaultChannels: [
        {
            id: 'pugio.pipelines',
            apiPrefix: 'https://pugio-channel-pipelines.lenconda.top/api/v1',
        },
    ],
}));
