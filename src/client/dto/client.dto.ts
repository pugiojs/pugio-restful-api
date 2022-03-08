import { ClientStatusDTO } from 'src/client-status/dto/client-status.dto';
import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'clients' })
@Index(['createdAt', 'id'])
export class ClientDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @Column({
        nullable: true,
    })
    public description: string;

    @Column({
        name: 'device_id',
        nullable: true,
        select: false,
    })
    public deviceId: string;

    @Column({ default: true })
    public verified: boolean;

    @Column({ default: '1.0.0' })
    public version: string;

    @Column({
        type: 'longtext',
        name: 'public_key',
        nullable: true,
        default: null,
        select: false,
    })
    public publicKey: string;

    @Column({
        type: 'longtext',
        name: 'private_key',
        nullable: true,
        default: null,
        select: false,
    })
    public privateKey: string;

    @OneToMany(
        () => ClientStatusDTO,
        (clientStatusDTO) => clientStatusDTO.client,
    )
    public statuses: ClientStatusDTO[];

    @OneToMany(
        () => UserClientDTO,
        (userClientDTO) => userClientDTO.client,
    )
    public clientUsers: UserClientDTO[];

    @OneToMany(
        () => ChannelClientDTO,
        (channelClientDTO) => channelClientDTO.client,
    )
    public clientChannels: ChannelClientDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
