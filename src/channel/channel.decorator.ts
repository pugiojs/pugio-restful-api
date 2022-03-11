import * as _ from 'lodash';
import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { ChannelDTO } from './dto/channel.dto';

export const CurrentChannel = createParamDecorator(
    (data: string, context: ExecutionContext): ChannelDTO => {
        const channel = _.get(context.switchToHttp().getRequest(), 'user.$channel');

        if (!channel) {
            return null;
        }

        const channelData = (data ? channel[data] : channel) as ChannelDTO;

        return channelData;
    },
);
