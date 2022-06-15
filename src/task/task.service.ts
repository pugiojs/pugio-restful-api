import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientStatusDTO } from 'src/client-status/dto/client-status.dto';
import {
    LessThan,
    Repository,
} from 'typeorm';

@Injectable()
export class TaskService {
    private readonly logger = new Logger('TaskService');

    public constructor(
        @InjectRepository(ClientStatusDTO)
        private readonly clientStatusRepository: Repository<ClientStatusDTO>,
    ) {}

    @Cron('0 0 */2 * * *')
    public async handleCleanClientStatusRecords() {
        try {
            const date = new Date(Date.now() - 48 * 60 * 60 * 1000);
            await this.clientStatusRepository.delete({
                createdAt: LessThan(date),
            });
            this.logger.log('Client statuses cleaned, before ' + date.toISOString());
        } catch (e) {
            this.logger.warn('Failed to clean client statuses: ' + e.toString());
        }
    }
}
