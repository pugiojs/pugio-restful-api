import { Module } from '@nestjs/common';
import { ClientStatusService } from './client-status.service';
import { ClientStatusController } from './client-status.controller';

@Module({
    providers: [ClientStatusService],
    controllers: [ClientStatusController],
    exports: [ClientStatusService],
})
export class ClientStatusModule {}
