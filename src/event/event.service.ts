import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import * as _ from 'lodash';
import {
    ERR_WS_EMPTY_MESSAGE_BODY,
    ERR_WS_INVALID_MESSAGE_BODY,
    ERR_WS_SERVER_NOT_CONNECTED,
} from 'src/app.constants';
import { Gateway } from 'src/app.interfaces';

@Injectable()
export class EventService {
    private gateway: Gateway;

    public setGateway(gateway: Gateway) {
        this.gateway = gateway;
    }

    public broadcast(roomName: string, eventName: string, message: Object | string) {
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

        if (!_.get(this.gateway, 'server.clients')) {
            throw new InternalServerErrorException(ERR_WS_SERVER_NOT_CONNECTED);
        }

        const clientReadyStateList = [];

        this.gateway.server.to(roomName).emit(eventName, JSON.stringify({
            event: eventName,
            content: messageContent,
            timestamp: Date.now(),
        }));

        return {
            amount: clientReadyStateList.filter((readyState) => readyState === 1).length,
        };
    }
}
