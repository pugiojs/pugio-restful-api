import {
    Injectable,
    // BadRequestException,
} from '@nestjs/common';
import * as _ from 'lodash';
import { UserDAO } from './dao/user.dao';
// import { Auth0Service } from 'src/auth0/auth0.service';
import { UtilService } from 'src/util/util.service';
import { ConfigService } from '@nestjs/config';
// import axios from 'axios';

@Injectable()
export class UserService {
    public constructor(
        // private readonly auth0Service: Auth0Service,
        private readonly utilService: UtilService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * update user information
     * @param {Partial<UserDTO>} updates
     * @returns {Promise<UserDTO>}
     */
    public async updateUserInformation(openId: string, updates: Partial<UserDAO>) {
        // const userPatchData: Partial<UserDAO> = _.pick(updates, ['name', 'nickname', 'picture', 'email']);

        // const result = await this.auth0Service.managementClient.updateUser(
        //     {
        //         id: openId,
        //     },
        //     userPatchData,
        // );

        // /**
        //  * if user changes email, then send an verification email to the user
        //  */
        // if (userPatchData.email) {
        //     await this.auth0Service.managementClient.sendEmailVerification({
        //         user_id: openId,
        //     });
        // }

        // return this.utilService.getUserDAOFromAuth0Response(result);
    }

    /**
     * change user password
     * @param {Omit<ResetPasswordOptions, 'connection'>} data change password data
     * @returns {Promise<any} change password result
     */
    public async changeUserPassword(email: string) {
        // if (!email || !_.isString(email)) {
        //     throw new BadRequestException();
        // }

        // const domain = this.configService.get('auth.domain');
        // const clientId = this.configService.get('auth.clientId');
        // const connection = this.configService.get('auth.connection') || 'Username-Password-Authentication';

        // console.log('LENCONDA', email);

        // const changePasswordURL = `https://${domain}/dbconnections/change_password`;

        // const { data: responseData } = await axios.post(changePasswordURL, {
        //     client_id: clientId,
        //     email,
        //     connection,
        // });

        // return {
        //     data: responseData,
        // };
    }
}
