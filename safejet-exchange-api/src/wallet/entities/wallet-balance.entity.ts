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
  userId: string;

  @Column()
  baseSymbol: string;

  @Column('decimal', { precision: 36, scale: 18, default: '0' })
  balance: string;

  @Column({ type: 'enum', enum: ['spot', 'funding'] })
  type: 'spot' | 'funding';

  @Column('jsonb', { nullable: true })
  metadata: {
    networks: {
      [blockchain: string]: {
        walletId: string;
        tokenId: string;
        networkVersion: string;
        contractAddress?: string;
        network: string;
      }
    }
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 