import { Module } from '@nestjs/common';
import { ClientStatusService } from './client-status.service';
import { ClientStatusController } from './client-status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientStatusDTO } from './dto/client-status.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import { ClientModule } from 'src/client/client.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ClientStatusDTO,
            ClientDTO,
        ]),
        ClientModule,
    ],
    providers: [ClientStatusService],
    controllers: [ClientStatusController],
    exports: [ClientStatusService],
})
export class ClientStatusModule {}
