import { KeyDTO } from 'src/key/dto/key.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserDTO {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: 'open_id' })
    public openId: string;

    @Column()
    public email: string;

    @Column()
    public picture: string;

    @Column({ name: 'full_name', nullable: true })
    public fullName: string;

    @Column({ name: 'first_name', nullable: true })
    public firstName: string;

    @Column({ name: 'middle_name', nullable: true })
    public middleName: string;

    @Column({ name: 'last_name', nullable: true })
    public lastName: string;

    @Column()
    public active: boolean;

    @Column()
    public verified: boolean;

    @OneToMany(() => KeyDTO, (keyDTO) => keyDTO.owner)
    public keys: KeyDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
