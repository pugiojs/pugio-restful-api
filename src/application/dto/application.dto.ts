import { GroupDTO } from 'src/group/dto/group.dto';
import { UserApplicationDTO } from 'src/relations/user-application.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'applications' })
export class ApplicationDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @OneToMany(
        () => UserApplicationDTO,
        (userApplicationDTO) => userApplicationDTO.user,
    )
    public applicationMembers: UserApplicationDTO[];

    @OneToMany(() => GroupDTO, (groupDTO) => groupDTO.application)
    public groups: GroupDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
