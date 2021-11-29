import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    manageAudience: process.env.AUTH0_MANAGE_AUDIENCE,
    userinfoTag: process.env.AUTH0_USERINFO_TAG,
}));
