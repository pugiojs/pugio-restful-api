import {
    Controller,
    Post,
    Body,
} from '@nestjs/common';
import { VendorService } from './vendor.service';

@Controller('/vendor')
export class VendorController {
    public constructor(
        private readonly vendorService: VendorService,
    ) {}

    @Post('/refresh_token')
    public async getRefreshedToken(
        @Body('refresh_token') refreshToken: string,
        @Body('client_id') clientId: string,
    ) {
        return await this.vendorService.getRefreshedToken(refreshToken, clientId);
    }
}
