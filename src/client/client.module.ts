import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerModule } from 'src/locker/locker.module';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientDTO } from './dto/client.dto';

@Module({
    imports: [
        LockerModule,
        TypeOrmModule.forFeature([
            UserClientDTO,
            ClientDTO,
        ]),
    ],
    controllers: [ClientController],
    providers: [ClientService],
    exports: [ClientService],
})
export class ClientModule {}
