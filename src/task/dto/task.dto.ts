import { ExecutionDTO } from 'src/execution/dto/execution.dto';
import { HookDTO } from 'src/hook/dto/hook.dto';
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

@Entity({ name: 'tasks' })
@Index(['createdAt', 'id'])
export class TaskDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({
        nullable: true,
        default: null,
    })
    public script: string;

    @Column()
    public props: string;

    /**
     * - -4: enqueue error
     * - -3: key pair failure
     * - -2: script-parse-errored
     * - -1: runtime-errored
     * - 1: queueing
     * - 2: waiting
     * - 3: running
     * - 4: done
     */
    @Column({ default: 1 })
    public status: number;

    @OneToMany(
        () => ExecutionDTO,
        (executionDTO) => executionDTO.task,
    )
    public executions: ExecutionDTO[];

    @ManyToOne(
        () => HookDTO,
        (hookDTO) => hookDTO.tasks,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'hook_id' })
    public hook: HookDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
