import { Module } from '@nestjs/common';
import { EventModule } from 'src/event/event.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
    imports: [EventModule],
    controllers: [ClientController],
    providers: [ClientService],
    exports: [ClientService],
})
export class ClientModule {}
