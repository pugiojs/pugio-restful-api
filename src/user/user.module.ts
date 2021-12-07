import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDTO } from './dto/user.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserDTO,
        ]),
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
