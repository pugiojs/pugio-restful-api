import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { ClientDTO } from 'src/client/dto/client.dto';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { ChannelDTO } from './dto/channel.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChannelDTO,
            ChannelClientDTO,
        ]),
        ClientModule,
    ],
    controllers: [ChannelController],
    providers: [ChannelService],
    exports: [ChannelService],
})
export class ChannelModule {}
