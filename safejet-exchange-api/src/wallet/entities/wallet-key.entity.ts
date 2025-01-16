import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wallet_keys')
export class WalletKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  encryptedPrivateKey: string;

  @Column()
  encryptionVersion: number;

  @Column({ default: 'hot' })
  keyType: string;

  @Column({ type: 'jsonb', nullable: true })
  backupData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 