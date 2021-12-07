import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ERR_HTTP_MISSING_BODY_PROPERTY,
    ERR_HTTP_USER_NOT_FOUND,
} from 'src/app.constants';
import { Repository } from 'typeorm';
import { UserDTO } from './dto/user.dto';
import * as _ from 'lodash';
import { UserDAO } from './dao/user.dao';
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
        if (!userInformation || userInformation.email) {
            throw new BadRequestException(ERR_HTTP_MISSING_BODY_PROPERTY);
        }

        const currentUserDTO = await this.userRepository.findOne({
            email: userInformation.email,
        });

        const newPartialCurrentUserDTO = _.omit(userInformation, ['id', 'createdAt', 'updatedAt']);

        if (currentUserDTO) {
            await this.userRepository.update(
                {
                    id: currentUserDTO.id,
                },
                newPartialCurrentUserDTO,
            );
            return {
                ...currentUserDTO,
                ...newPartialCurrentUserDTO,
            };
        } else {
            const newUserInformation = this.userRepository.create(userInformation);
            return await this.userRepository.save(newUserInformation);
        }
    }

    /**
     * update user information
     * @param {Partial<UserDTO>} userInformation
     * @returns {Promise<UserDTO>}
     */
    public async updateUserInformation(id: number, userInformation: Partial<UserDAO>) {
        const currentUserDTO = await this.userRepository.findOne({
            id,
        });

        if (!currentUserDTO) {
            throw new NotFoundException(ERR_HTTP_USER_NOT_FOUND);
        }

        return await this.userRepository.update(
            {
                id,
            },
            _.omit(this.utilService.transformDAOToDTO<UserDAO, UserDTO>(userInformation), ['id', 'createdAt', 'updatedAt']),
        );
    }
}
