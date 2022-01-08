import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';

@Injectable()
export class EventService {
    private ws: WebSocket

    public constructor() {
        this.ws = new WebSocket('ws://127.0.0.1:5000/api/v1/websocket');
    }

    public async test() {
        this.ws.send(JSON.stringify({
            event: 'execute',
            data: new Date().toISOString(),
        }));
    }
}
