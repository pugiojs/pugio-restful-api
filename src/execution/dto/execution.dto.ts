import { TaskDTO } from 'src/task/dto/task.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'executions' })
@Index(['id', 'sequence'], { unique: true })
@Index(['task', 'sequence'], { unique: true })
export class ExecutionDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public sequence: number;

    @Column({ nullable: true })
    public content: string;

    @ManyToOne(
        () => TaskDTO,
        (taskDTO) => taskDTO.executions,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'task_id' })
    public task: TaskDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
