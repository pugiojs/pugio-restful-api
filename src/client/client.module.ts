import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyModule } from 'src/key/key.module';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { UserModule } from 'src/user/user.module';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientDTO } from './dto/client.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserClientDTO,
            ClientDTO,
            ChannelClientDTO,
        ]),
        KeyModule,
        ConfigModule,
        UserModule,
    ],
    controllers: [ClientController],
    providers: [
        ClientService,
    ],
    exports: [
        ClientService,
    ],
})
export class ClientModule {}
