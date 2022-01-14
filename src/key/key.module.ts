import { Module } from '@nestjs/common';
import { KeyService } from './key.service';
import { KeyController } from './key.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyDTO } from './dto/key.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            KeyDTO,
            UserClientDTO,
        ]),
    ],
    providers: [KeyService],
    controllers: [KeyController],
    exports: [KeyService],
})
export class KeyModule {}
