import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { EventModule } from 'src/event/event.module';
import { HookDTO } from 'src/hook/dto/hook.dto';
import { TaskDTO } from './dto/task.dto';
import { TaskController } from './task.controller';
import { TaskGateway } from './task.gateway';
import { TaskService } from './task.service';

@Module({
    imports: [
        EventModule,
        ClientModule,
        TypeOrmModule.forFeature([TaskDTO, HookDTO]),
    ],
    controllers: [TaskController],
    providers: [TaskService, TaskGateway],
    exports: [TaskService, TaskGateway],
})
export class TaskModule {}
