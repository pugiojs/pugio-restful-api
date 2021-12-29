import { ApplicationDTO } from 'src/application/dto/application.dto';
import { GroupAccountDTO } from 'src/relations/group-account.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'groups' })
export class GroupDTO {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public name: string;

    @ManyToOne(
        () => ApplicationDTO,
        (applicationDTO) => applicationDTO.groups,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'application_id' })
    public application: ApplicationDTO;

    @OneToMany(() => GroupAccountDTO, (groupAccountDTO) => groupAccountDTO.group)
    public groupAccounts: GroupAccountDTO[];

    @OneToMany(() => GroupDTO, (groupDTO) => groupDTO.parent)
    public children: GroupDTO[];

    @ManyToOne(
        () => GroupDTO,
        (groupDTO) => groupDTO.children,
        {
            nullable: true,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'parent_group_id' })
    public parent: GroupDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
