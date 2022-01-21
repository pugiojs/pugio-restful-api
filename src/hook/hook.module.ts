import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { ClientDTO } from 'src/client/dto/client.dto';
import { TaskDTO } from 'src/task/dto/task.dto';
import { HookDTO } from './dto/hook.dto';
import { HookController } from './hook.controller';
import { HookService } from './hook.service';

@Module({
    imports: [
        ClientModule,
        TypeOrmModule.forFeature([
            HookDTO,
            TaskDTO,
            ClientDTO,
        ]),
    ],
    controllers: [HookController],
    providers: [HookService],
    exports: [HookService],
})
export class HookModule {}
