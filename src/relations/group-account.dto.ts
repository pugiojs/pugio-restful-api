import { AccountDTO } from 'src/account/dto/account.dto';
import { GroupDTO } from 'src/group/dto/group.dto';
import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'group_accounts' })
export class GroupAccountDTO {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne(() => AccountDTO, (accountDTO) => accountDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'account_id' })
    public account: AccountDTO;

    @ManyToOne(() => GroupDTO, (groupDTO) => groupDTO.id, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'group_id' })
    public group: GroupDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
