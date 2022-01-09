import { Injectable } from '@nestjs/common';
import { EventService } from 'src/event/event.service';

@Injectable()
export class ClientService {
    public constructor(
        private readonly eventService: EventService,
    ) {}

    public sendExecutionResult(executionId: number, content: string) {
        return this.eventService.sendExecutionResult(executionId, content);
    }
}
