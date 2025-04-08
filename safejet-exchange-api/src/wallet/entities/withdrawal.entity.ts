import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Token } from './token.entity';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  tokenId: string;

  @Column()
  address: string;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: string;

  @Column('decimal', { precision: 36, scale: 18 })
  fee: string;

  @Column()
  networkVersion: string;

  @Column()
  network: string;

  @Column({ nullable: true })
  memo?: string;

  @Column({ nullable: true })
  tag?: string;

  @Column({ nullable: true })
  txHash?: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'tokenId' })
  token: Token;
} 