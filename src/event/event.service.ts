import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';

@Injectable()
export class EventService {
    private ws: WebSocket

    public constructor() {
        this.ws = new WebSocket('wss://pugio-dev.lenconda.top/ws');
    }

    public async test() {
        this.ws.send(JSON.stringify({
            event: 'execute',
            data: new Date().toISOString(),
        }));
    }
}
