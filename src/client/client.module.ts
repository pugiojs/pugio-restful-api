import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientController } from './client.controller';
import { ClientGateway } from './client.gateway';
import { ClientService } from './client.service';
import { ClientDTO } from './dto/client.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserClientDTO,
            ClientDTO,
            ChannelClientDTO,
        ]),
    ],
    controllers: [ClientController],
    providers: [ClientService, ClientGateway],
    exports: [ClientService, ClientGateway],
})
export class ClientModule {}
