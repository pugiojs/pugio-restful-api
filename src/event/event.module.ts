import { Module } from '@nestjs/common';
import { EventsGateway } from './event.gateway';
import { EventService } from './event.service';
import { EventController } from './event.controller';

@Module({
    providers: [EventsGateway, EventService],
    controllers: [EventController],
})
export class EventModule {}
