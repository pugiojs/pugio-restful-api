import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LockerService } from './locker.service';

@Module({
    imports: [ConfigModule],
    providers: [LockerService],
    exports: [LockerService],
})
export class LockerModule {}
