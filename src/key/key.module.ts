import { Module } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyController } from './key.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyDTO } from './dto/key.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            KeyDTO,
        ]),
    ],
    providers: [KeyService],
    controllers: [KeyController],
    exports: [KeyService],
})
export class KeyModule {}
