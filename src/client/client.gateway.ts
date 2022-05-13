import {
    forwardRef,
    Inject,
    Logger,
} from '@nestjs/common';
import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Gateway } from 'src/app.interfaces';
import {
    Server,
    Socket,
} from 'socket.io';
import * as _ from 'lodash';
import { KeyService } from 'src/key/key.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ClientService } from './client.service';
import { UserService } from 'src/user/user.service';

@WebSocketGateway({
    namespace: 'client',
    cors: {
        credentials: true,
        methods: ['*'],
        origin: ['*'],
    },
    transports: ['polling', 'websocket'],
})
export class ClientGateway implements Gateway {
    @WebSocketServer()
    public server: Server;
    private logger: Logger = new Logger('ClientGateway');

    public constructor (
        private readonly keyService: KeyService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => ClientService))
        private readonly clientService: ClientService,
        private readonly userService: UserService,
    ) {}

    public afterInit() {
        this.logger.log('Socket.io server initialized');
    }

    public handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    public handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

	@SubscribeMessage('join')
    public handleJoinRoom(client: Socket, roomId: string) {
        const validatePermissionPromise: Promise<string> = new Promise((resolve, reject) => {
            const tokenInfo = _.get(client.handshake, 'headers.authorization') as string;
            const [type = '', token = ''] = tokenInfo.split(/\s+/g);

            switch (type.toLocaleLowerCase()) {
                case 'ak': {
                    this.keyService.validateApiKey(token, ['socket'], 'all')
                        .then((user) => {
                            if (_.isString(user?.id)) {
                                resolve(user.id);
                            } else {
                                reject(new Error());
                            }
                        })
                        .catch(() => reject(new Error()));
                    break;
                }
                case 'ck': {
                    this.keyService.validateClientKey(token)
                        .then(({ user }) => {
                            if (_.isString(user?.id)) {
                                resolve(user.id);
                            } else {
                                reject(new Error());
                            }
                        })
                        .catch(() => reject(new Error()));
                    break;
                }
                case 'bearer': {
                    const audience = this.configService.get<string>('auth.audience');
                    const accountCenterApi = this.configService.get<string>('auth.accountCenterApi');
                    axios.post(
                        `${accountCenterApi}/oauth2/validate`, {
                            token,
                            audience,
                        },
                        {
                            responseType: 'json',
                        },
                    ).then((res) => {
                        if (!res?.data?.sub) {
                            return Promise.reject(new Error());
                        }

                        return this.userService.getUserInformation({ openId: res.data.sub });
                    }).then((user) => {
                        if (user) {
                            resolve(user.id);
                        } else {
                            reject(new Error());
                        }
                    }).catch(() => {
                        reject(new Error());
                    });
                }
            }
        });

        validatePermissionPromise.then((userId) => {
            return this.clientService.checkPermission({
                userId,
                clientId: roomId,
            });
        })
            .then((valid) => {
                if (valid) {
                    client.join(roomId);
                    this.logger.log('Client ' + client.id + ' joined room: ' + roomId);
                } else {
                    return Promise.reject(new Error());
                }
            })
            .catch(() => {
                this.logger.log('User permission validation failed, socket: ' + client.id + ', room: ' + roomId);
                client.disconnect();
            });
    }

	@SubscribeMessage('leave')
	public handleLeftRoom(client: Socket, roomId: string) {
	    client.leave(roomId);
	}

    @SubscribeMessage('channel_stream')
	public handleChannelStream(client: Socket, data: any) {
	    const {
	        eventId,
	        roomId,
	        data: content,
	    } = data;

	    this.server.to(roomId).emit(eventId, content);
	}
}
