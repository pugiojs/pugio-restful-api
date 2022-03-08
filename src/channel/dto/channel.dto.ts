import { ChannelClientDTO } from 'src/relations/channel-client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'channels' })
@Index(['createdAt', 'id'])
export class ChannelDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @Column({ nullable: true })
    public description: string;

    @Column({ name: 'package_name' })
    public packageName: string;

    @Column({ default: '' })
    public avatar: string;

    @Column({ name: 'bundle_url' })
    public bundleUrl: string;

    @Column({ default: 'https://registry.npmjs.org' })
    public registry: string;

    @Column({ select: false })
    public key: string;

    @OneToMany(
        () => ChannelClientDTO,
        (channelClientDTO) => channelClientDTO.channel,
    )
    public channelClients: ChannelClientDTO[];

    @ManyToOne(() => UserDTO, (userDTO) => userDTO.channels, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'creator_id' })
    public creator: UserDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
