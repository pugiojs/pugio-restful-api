import {
    Injectable,
} from '@nestjs/common';
import { UtilService } from 'src/util/util.service';
import { LockerService } from 'src/locker/locker.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';

@Injectable()
export class ClientService {
    public constructor(
        private readonly utilService: UtilService,
        private readonly lockerService: LockerService,
        // @InjectRepository(ClientDTO)
        // private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
    ) {}

    public async lockExecutionTaskChannel(clientId: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.lock(lockName);
    }

    public async unlockExecutionTaskChannel(clientId: string, value: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.unlock(lockName, value);
    }

    public async checkPermission(
        userId: string,
        clientId: string,
        permission: number,
    ) {
        const relations = await this.userClientRepository
            .find({
                where: {
                    user: {
                        id: userId,
                    },
                    client: {
                        id: clientId,
                    },
                },
            });

        if (relations.length === 0) {
            return false;
        }

        if (permission === -1) {
            return true;
        }

        return relations.some((relation) => relation.roleType === permission);
    }
}
