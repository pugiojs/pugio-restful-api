import { Injectable } from '@nestjs/common';
import { EventService } from 'src/event/event.service';
import * as child_process from 'child_process';

@Injectable()
export class ClientService {
    public constructor(
        private readonly eventService: EventService,
    ) {}

    public async sendExecutionResult(executionId: number, command: string) {
        return new Promise((resolve, reject) => {
            const [mainCommand, ...args] = command.split(' ');
            const proc = child_process.spawn(mainCommand, args);
            proc.stdout.on('data', (data) => {
                this.eventService.sendExecutionResult(executionId, data.toString());
            });
            proc.on('close', () => resolve(undefined));
        });
    }
}
