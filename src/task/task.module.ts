import { Module } from '@nestjs/common';
import { ClientModule } from 'src/client/client.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
    imports: [ClientModule],
    controllers: [TaskController],
    providers: [TaskService],
    exports: [TaskService],
})
export class TaskModule {}
