import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { Oauth2Module } from 'src/oauth2/oauth2.module';

@Module({
    imports: [Oauth2Module],
    providers: [VendorService],
    controllers: [VendorController],
    exports: [VendorService],
})
export class VendorModule {}
