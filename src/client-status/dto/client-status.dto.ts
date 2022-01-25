import { ClientDTO } from 'src/client/dto/client.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'client_statuses' })
@Index(['createdAt', 'id'])
export class ClientStatusDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    /**
     * - 1: normal
     * - 2: key pair failure
     */
    @Column()
    public status: number;

    @ManyToOne(
        () => ClientDTO,
        (clientDTO) => clientDTO.statuses,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'client_id' })
    public client: ClientDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
