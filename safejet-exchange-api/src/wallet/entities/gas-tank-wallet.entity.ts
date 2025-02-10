import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('gas_tank_wallets')
export class GasTankWallet {
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

    @Column({ default: 'gas_tank' })
    type: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 