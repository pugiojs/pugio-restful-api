import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
    domain: process.env.OAUTH2_DOMAIN,
    clientId: process.env.OAUTH2_CLIENT_ID,
    clientSecret: process.env.OAUTH2_CLIENT_SECRET,
    audience: process.env.OAUTH2_AUDIENCE,
    manageAudience: process.env.OAUTH2_MANAGE_AUDIENCE,
    userinfoTag: process.env.OAUTH2_USERINFO_TAG,
    connection: process.env.OAUTH2_CONNECTION,
    apiKey: process.env.OAUTH2_APIKEY,
}));
