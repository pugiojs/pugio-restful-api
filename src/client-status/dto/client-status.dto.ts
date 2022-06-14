import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'client_statuses' })
export class ClientStatusDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    /**
     * - -2: key pair not defined
     * - -1: key pair parse failed
     * - 1: normal
     */
    @Column({ default: 1 })
    public status: number;

    @Column({ type: 'longtext', nullable: true, default: null })
    public system: string;

    @ManyToOne(
        () => ClientDTO,
        (clientDTO) => clientDTO.statuses,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'client_id' })
    public client: ClientDTO;

    @OneToOne(
        () => ClientStatusDTO,
        (clientStatus) => clientStatus.id,
        {
            nullable: true,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'previous_record_id' })
    public previous: ClientStatusDTO;

    @ManyToOne(
        () => UserDTO,
        (reporter) => reporter.clientStatusReports,
        {
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        },
    )
    @JoinColumn({ name: 'reporter_id' })
    public reporter: UserDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
