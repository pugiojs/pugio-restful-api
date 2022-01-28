import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionDTO } from './dto/execution.dto';
import { ClientModule } from 'src/client/client.module';
import { TaskDTO } from 'src/task/dto/task.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ExecutionDTO,
                TaskDTO,
            ],
        ),
        ClientModule,
    ],
    providers: [ExecutionService],
    controllers: [ExecutionController],
    exports: [ExecutionService],
})
export class ExecutionModule {}
