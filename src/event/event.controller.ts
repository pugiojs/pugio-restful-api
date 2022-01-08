import { Controller, Get } from '@nestjs/common';
import { EventsGateway } from './event.gateway';
import { EventService } from './event.service';

@Controller('/event')
export class EventController {
    public constructor(
        private readonly eventService: EventService,
        private readonly eventsGateway: EventsGateway,
    ) {}

    @Get('/test')
    public async test() {
        return this.eventsGateway.server.emit('execute', new Date().toISOString());
        // return await this.eventService.test();
    }
}
