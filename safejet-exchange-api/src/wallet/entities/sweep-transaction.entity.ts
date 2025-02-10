import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sweep_transactions')
export class SweepTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    depositId: string;

    @Column()
    fromWalletId: string;

    @Column()
    toAdminWalletId: string;

    @Column()
    amount: string;

    @Column({
        type: 'enum',
        enum: ['pending', 'completed', 'failed', 'skipped'],
        default: 'pending'
    })
    status: 'pending' | 'completed' | 'failed' | 'skipped';

    @Column({ nullable: true })
    txHash?: string;

    @Column({ type: 'text', nullable: true })
    message?: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 