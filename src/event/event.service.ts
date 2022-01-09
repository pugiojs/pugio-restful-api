import { Injectable } from '@nestjs/common';
import { EventsGateway } from './event.gateway';

@Injectable()
export class EventService {
    public constructor(
        private readonly eventsGateway: EventsGateway,
    ) {}

    public async test() {
        const result = [];

        this.eventsGateway.server.clients.forEach((client) => {
            client.send(new Date().toISOString());
            result.push(client.readyState);
        });

        return {
            amount: result.filter((item) => item === 1).length,
        };
    }
}
