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
import { UserDAO } from './dao/user.dao';
import { Auth0Service } from 'src/auth0/auth0.service';
import { UtilService } from 'src/util/util.service';

@Injectable()
export class UserService {
    public constructor(
        @InjectRepository(UserDTO)
        private readonly userRepository: Repository<UserDTO>,
        private readonly auth0Service: Auth0Service,
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

        const newPartialCurrentUserDTO = _.omit(userInformation, ['id', 'openId', 'createdAt', 'updatedAt']);

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
     * @param {Partial<UserDTO>} updates
     * @returns {Promise<UserDTO>}
     */
    public async updateUserInformation(openId: string, updates: Partial<UserDAO>) {
        const userPatchData: Partial<UserDAO> = _.pick(updates, ['name', 'nickname', 'picture', 'email']);

        const result = await this.auth0Service.managementClient.updateUser(
            {
                id: openId,
            },
            userPatchData,
        );

        if (userPatchData) {
            await this.auth0Service.managementClient.sendEmailVerification({
                user_id: openId,
            });
        }

        return this.utilService.getUserDAOFromAuth0Response(result);
    }
}
