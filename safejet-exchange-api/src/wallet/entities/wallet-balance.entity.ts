import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { Wallet } from './wallet.entity';
import { Token } from './token.entity';

@Entity('wallet_balances')
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column()
  tokenId: string;

  @ManyToOne(() => Token)
  token: Token;

  @Column('decimal', { precision: 36, scale: 18 })
  balance: string;

  @Column()
  type: 'spot' | 'funding';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 