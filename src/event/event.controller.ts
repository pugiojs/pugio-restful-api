import { Controller, Get } from '@nestjs/common';
import { EventService } from './event.service';

@Controller('/event')
export class EventController {
    public constructor(
        private readonly eventService: EventService,
    ) {}

    @Get('/test')
    public async test() {
        return await this.eventService.test();
    }
}
