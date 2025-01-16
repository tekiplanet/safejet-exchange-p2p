import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn, 
  JoinColumn 
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { Token } from './token.entity';

@Entity('wallet_balances')
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @Column()
  tokenId: string;

  @Column('decimal', { precision: 36, scale: 18, default: '0' })
  balance: string;

  @Column({ type: 'enum', enum: ['spot', 'funding'] })
  type: 'spot' | 'funding';

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'tokenId' })
  token: Token;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
} 