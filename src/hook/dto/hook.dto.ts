import { ClientDTO } from 'src/client/dto/client.dto';
import { TaskDTO } from 'src/task/dto/task.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'hooks' })
@Index(['createdAt', 'id'])
export class HookDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @Column({ nullable: true })
    public description: string;

    @Column({ default: '{}' })
    public mapper: string;

    @Column({
        name: 'pre_command_segment',
        nullable: true,
        default: null,
    })
    public preCommandSegment: string;

    @Column({
        name: 'post_command_segment',
        nullable: true,
        default: null,
    })
    public postCommandSegment: string;

    @Column({
        nullable: true,
        default: null,
    })
    public template: string;

    @Column({
        name: 'execution_cwd',
        nullable: true,
    })
    public executionCwd: string;

    @ManyToOne(() => ClientDTO, (clientDTO) => clientDTO.hooks, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'client_id' })
    public client: ClientDTO;

    @OneToMany(() => TaskDTO, (taskDTO) => taskDTO.hook)
    public tasks: TaskDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
