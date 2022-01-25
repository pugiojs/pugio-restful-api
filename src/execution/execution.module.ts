import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionDTO } from './dto/execution.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                ExecutionDTO,
            ],
        ),
    ],
    providers: [ExecutionService],
    controllers: [ExecutionController],
    exports: [ExecutionService],
})
export class ExecutionModule {}
