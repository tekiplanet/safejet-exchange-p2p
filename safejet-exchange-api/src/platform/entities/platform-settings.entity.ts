import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';

@Entity('platform_settings')
export class PlatformSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    key: string;

    @Column({ type: 'jsonb' })
    value: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: 'general' })
    category: string;

    @Column({ default: false })
    isSensitive: boolean;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: 'lastUpdatedBy' })
    lastUpdatedBy: Admin;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 