import { Module } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyController } from './key.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyDTO } from './dto/key.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { ChannelDTO } from 'src/channel/dto/channel.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            KeyDTO,
            UserClientDTO,
            ClientDTO,
            ChannelClientDTO,
            ChannelDTO,
        ]),
    ],
    providers: [KeyService],
    controllers: [KeyController],
    exports: [KeyService],
})
export class KeyModule {}
