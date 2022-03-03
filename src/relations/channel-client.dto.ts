import { ChannelDTO } from 'src/channel/dto/channel.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import {
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'channel_clients' })
@Index(['createdAt', 'id'])
@Index(['channel', 'client'], { unique: true })
export class ChannelClientDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @ManyToOne(
        () => ChannelDTO,
        (channelDTO) => channelDTO.id,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'channel_id' })
    public channel: ChannelDTO;

    @ManyToOne(() => ClientDTO, (clientDTO) => clientDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'client_id' })
    public client: ClientDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
