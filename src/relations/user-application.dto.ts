import { ApplicationDTO } from 'src/application/dto/application.dto';
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

@Entity({ name: 'user_applications' })
export class UserApplicationDTO {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne(() => UserDTO, (userDTO) => userDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'user_id' })
    public user: UserDTO;

    @ManyToOne(() => ApplicationDTO, (applicationDTO) => applicationDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'application_id' })
    public application: ApplicationDTO;

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
