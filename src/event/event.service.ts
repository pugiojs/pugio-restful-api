import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';

@Injectable()
export class EventService {

    // public constructor(
    //     private readonly
    // ) {}

    public async test() {
        const ws = new WebSocket('ws://127.0.0.1:5000/api/v1/websocket');
        ws.send(JSON.stringify({
            event: 'execute',
            
        }));
    }
}
