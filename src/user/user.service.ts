import {
    Injectable,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ERR_HTTP_MISSING_BODY_PROPERTY,
} from 'src/app.constants';
import { Repository } from 'typeorm';
import { UserDTO } from './dto/user.dto';
import * as _ from 'lodash';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class UserService {
    public constructor(
        @InjectRepository(UserDTO)
        private readonly userRepository: Repository<UserDTO>,
        private readonly utilService: UtilService,
    ) {}

    /**
     * create or update the information of a user
     * if user does not exist in database, then it will create a new user entity
     * otherwise it will only update the information of the specified user
     * @param {Partial<UserDTO>} userInformation
     * @returns {Promise<UserDTO>}
     */
    public async syncUserInformation(userInformation: Partial<UserDTO>) {
        if (!userInformation || !userInformation.openId) {
            throw new BadRequestException(ERR_HTTP_MISSING_BODY_PROPERTY);
        }

        const currentUserDTO = await this.userRepository.findOne({
            openId: userInformation.openId,
        });

        const newPartialCurrentUserDTO = _.omit(
            userInformation,
            [
                'id',
                'openId',
                'createdAt',
                'updatedAt',
            ],
        );

        let data;

        if (currentUserDTO) {
            await this.userRepository.update(
                {
                    id: currentUserDTO.id,
                },
                newPartialCurrentUserDTO,
            );
            data = {
                ...currentUserDTO,
                ...newPartialCurrentUserDTO,
            };
        } else {
            const newUserInformation = this.userRepository.create(
                _.omit(
                    userInformation,
                    [
                        'createdAt',
                        'updatedAt',
                    ],
                ),
            );
            data = await this.userRepository.save(newUserInformation);
        }

        return data;
    }

    public async queryUsers(
        options: PaginationQueryServiceOptions<UserDTO> = {},
    ) {
        const result = await this.utilService.queryWithPagination<UserDTO>({
            ...options,
            repository: this.userRepository,
            searchKeys: [
                'id',
                'openId',
                'email',
                'fullName',
                'firstName',
                'middleName',
                'lastName',
            ],
        });

        return result;
    }

    public async getUserInformation(options: Partial<UserDTO>) {
        return await this.userRepository.findOne({
            where: options,
        });
    }
}
