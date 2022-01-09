import { Module } from '@nestjs/common';
import { EventsGateway } from './event.gateway';
import { EventService } from './event.service';

@Module({
    providers: [EventsGateway, EventService],
    exports: [EventService],
})
export class EventModule {}
