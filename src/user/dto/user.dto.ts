import {
    Column,
    CreateDateColumn,
    Entity,
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

    @Column({ name: 'full_name' })
    public fullName: string;

    @Column({ name: 'first_name' })
    public firstName: string;

    @Column({ name: 'last_name' })
    public lastName: string;

    @Column()
    public active: boolean;

    @Column()
    public verified: boolean;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
