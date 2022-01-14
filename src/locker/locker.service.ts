import {
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { UtilService } from 'src/util/util.service';
import {
    v5 as uuidv5,
} from 'uuid';

@Injectable()
export class LockerService {
    protected redisClient: Redis;
    protected expiration: number;

    public constructor(
        private readonly redisService: RedisService,
        private readonly utilService: UtilService,
        private readonly configService: ConfigService,
    ) {
        this.redisClient = this.redisService.getClient();
        this.expiration = this.configService.get('app.lockerExpiration');
    }

    public async lock(lockName: string) {
        let retryTimes = 0;
        const lockData = uuidv5(new Date().toISOString(), lockName);

        while (true) {
            try {
                const setNXResult = await this.redisClient.setnx(lockName, lockData);

                if (setNXResult) {
                    return {
                        error: 0,
                        data: lockData,
                    };
                } else {
                    const expirationMs = this.expiration * 1000;
                    if (retryTimes > Math.floor((expirationMs + 10000) / 500)) {
                        return {
                            error: 0,
                            data: null,
                        };
                    } else {
                        await this.utilService.sleep();
                    }
                }
            } catch (e) {
                return {
                    error: 1,
                    data: (e.message || e.toString()) as string,
                };
            }
        }
    }

    public async unlock(lockName, value) {
        const lockData = await this.redisClient.get(lockName);

        if (lockData !== value) {
            throw new ForbiddenException();
        }

        await this.redisClient.del(lockName);

        return {
            error: 0,
            data: lockData,
        };
    }
}