import { Injectable } from '@nestjs/common';
import { EventsGateway } from './event.gateway';

@Injectable()
export class EventService {
    public constructor(
        private readonly eventsGateway: EventsGateway,
    ) {}

    public async test() {
        this.eventsGateway.server.clients.forEach((client) => {
            client.send(new Date().toISOString());
        });

        return this.eventsGateway.server.clients.values();
    }
}
