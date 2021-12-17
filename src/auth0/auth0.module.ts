import {
    Module,
    Global,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Auth0Service } from './auth0.service';

@Global()
@Module({
    imports: [
        ConfigModule,
    ],
    providers: [Auth0Service],
    exports: [Auth0Service],
})
export class Auth0Module {}
