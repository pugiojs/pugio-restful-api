import {
    Injectable,
} from '@nestjs/common';
import { UtilService } from 'src/util/util.service';
import { LockerService } from 'src/locker/locker.service';

@Injectable()
export class ClientService {
    public constructor(
        private readonly utilService: UtilService,
        private readonly lockerService: LockerService,
    ) {}

    public async lockExecutionTaskChannel(clientId: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.lock(lockName);
    }

    public async unlockExecutionTaskChannel(clientId: string, value: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.unlock(lockName, value);
    }
}
