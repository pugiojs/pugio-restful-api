import { UserClientDTO } from 'src/relations/user-client.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'clients' })
@Index(['createdAt', 'id'])
export class ClientDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @Column({
        nullable: true,
    })
    public description: string;

    @Column({
        name: 'device_id',
        nullable: true,
        select: false,
    })
    public deviceId: string;

    @Column({
        default: true,
    })
    public verified: boolean;

    @OneToMany(() => UserClientDTO, (userClientDTO) => userClientDTO.client)
    public clientUsers: UserClientDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
