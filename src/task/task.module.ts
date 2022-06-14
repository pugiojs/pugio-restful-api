import {
    Global,
    Module,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientStatusDTO } from 'src/client-status/dto/client-status.dto';
import { TaskService } from './task.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([
            ClientStatusDTO,
        ]),
    ],
    providers: [
        TaskService,
    ],
    exports: [
        TaskService,
    ],
})
export class TaskModule {}
