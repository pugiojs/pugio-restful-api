import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { EventsGateway } from './event.gateway';
import * as _ from 'lodash';
import {
    ERR_WS_EMPTY_MESSAGE_BODY,
    ERR_WS_INVALID_MESSAGE_BODY,
    ERR_WS_SERVER_NOT_CONNECTED,
} from 'src/app.constants';

@Injectable()
export class EventService {
    public constructor(
        private readonly eventsGateway: EventsGateway,
    ) {}

    public async sendExecutionResult(executionId: number, content: string) {
        const message = {
            executionId,
            content,
        };
        return this.broadcast('execution_result', message);
    }

    private broadcast(eventName: string, message: Object | string) {
        let messageContent;

        try {
            messageContent = _.isString(message)
                ? message
                : JSON.stringify(message);
        } catch (e) {
            throw new InternalServerErrorException(ERR_WS_INVALID_MESSAGE_BODY);
        }

        if (!messageContent) {
            throw new BadRequestException(ERR_WS_EMPTY_MESSAGE_BODY);
        }

        if (!_.get(this.eventsGateway, 'server.clients')) {
            throw new InternalServerErrorException(ERR_WS_SERVER_NOT_CONNECTED);
        }

        const clientReadyStateList = [];

        this.eventsGateway.server.clients.forEach((client) => {
            client.send(JSON.stringify({
                event: eventName,
                content: messageContent,
                timestamp: Date.now(),
            }));
            clientReadyStateList.push(client.readyState);
        });

        return {
            amount: clientReadyStateList.filter((readyState) => readyState === 1).length,
        };
    }
}
