import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
    domain: process.env.OAUTH2_DOMAIN,
    clientId: process.env.OAUTH2_CLIENT_ID,
    clientSecret: process.env.OAUTH2_CLIENT_SECRET,
    audience: process.env.OAUTH2_AUDIENCE,
    manageAudience: process.env.OAUTH2_MANAGE_AUDIENCE,
    userinfoTag: process.env.OAUTH2_USERINFO_TAG,
    connection: process.env.OAUTH2_CONNECTION,
    tokenEndpoint: process.env.OAUTH2_TOKEN_ENDPOINT,
    apiKey: process.env.OAUTH2_TENANT_API_KEY,
    defaultRedirectUri: process.env.OAUTH2_DEFAULT_REDIRECT_URI,
    jwtIssuer: process.env.OAUTH2_JWT_ISSUER,
}));
