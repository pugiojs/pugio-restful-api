import { HookDTO } from 'src/hook/dto/hook.dto';
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

@Entity({ name: 'tasks' })
@Index(['createdAt', 'id'])
export class TaskDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({ name: 'pre_command_segment' })
    public preCommandSegment: string;

    @Column({
        name: 'post_command_segment',
        nullable: true,
    })
    public postCommandSegment: string;

    @ManyToOne(() => HookDTO, (hookDTO) => hookDTO.tasks, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'hook_id' })
    public hook: HookDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
