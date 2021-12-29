import { UserDTO } from 'src/user/dto/user.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'keys' })
export class KeyDTO {
    @PrimaryGeneratedColumn()
    public id: string;

    @Column({ name: 'key_id' })
    public keyId: string;

    @ManyToOne(() => UserDTO, (userDTO) => userDTO.keys, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    public owner: UserDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
