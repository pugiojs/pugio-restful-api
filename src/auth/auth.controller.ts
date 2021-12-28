import {
    Controller,
    Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
    @Inject()
    protected authService: AuthService;
}
