import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_wallets')
export class AdminWallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    blockchain: string;

    @Column()
    network: string;

    @Column()
    address: string;

    @Column()
    keyId: string;

    @Column()
    type: 'hot' | 'cold';

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 