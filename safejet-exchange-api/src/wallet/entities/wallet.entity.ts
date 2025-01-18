import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column()
  blockchain: string;

  @Column()
  address: string;

  @Column()
  keyId: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 'mainnet' })
  network: string;

  @Column({ nullable: true })
  memo: string;

  @Column({ nullable: true })
  tag: string;
} 