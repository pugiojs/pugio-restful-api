import { Module } from '@nestjs/common';
import { EventModule } from 'src/event/event.module';
import { ClientController } from './client.controller';
import { ClientGateway } from './client.gateway';
import { ClientService } from './client.service';

@Module({
    imports: [EventModule],
    controllers: [ClientController],
    providers: [ClientService, ClientGateway],
    exports: [ClientService, ClientGateway],
})
export class ClientModule {}
