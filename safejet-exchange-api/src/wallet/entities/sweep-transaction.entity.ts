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
    txHash: string;

    @Column()
    amount: string;

    @Column()
    status: 'pending' | 'completed' | 'failed';

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 