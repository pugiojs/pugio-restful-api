import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';

@Injectable()
export class EventService {
    private ws: WebSocket

    // public constructor(
    //     private readonly
    // ) {}

    public async test() {
        this.ws.send(JSON.stringify({
            event: 'execute',
            data: new Date().toISOString(),
        }));
    }
}
