import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
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

@Entity({ name: 'user_clients' })
@Index(['createdAt', 'id'])
export class UserClientDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @ManyToOne(() => UserDTO, (userDTO) => userDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    public user: UserDTO;

    @ManyToOne(() => ClientDTO, (clientDTO) => clientDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'client_id' })
    public client: ClientDTO;

    /**
     * - 0: owner
     * - 1: admin
     * - 2: member
     */
    @Column({ name: 'role_type' })
    public roleType: number;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
