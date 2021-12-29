import { GroupAccountDTO } from 'src/relations/group-account.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'accounts' })
export class AccountDTO {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public email: string;

    @Column()
    public picture: string;

    @Column({ nullable: true })
    public nickname: string;

    @OneToMany(() => GroupAccountDTO, (groupAccountDTO) => groupAccountDTO.account)
    public groupAccounts: GroupAccountDTO[];

    @Column({
        default: '{}',
        name: 'extra_info',
    })
    public extraInfo: string;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
