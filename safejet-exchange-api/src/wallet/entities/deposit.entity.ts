import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  walletId: string;

  @Column()
  tokenId: string;

  @Column()
  txHash: string;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: string;

  @Column()
  blockchain: string;  // ethereum, bitcoin, bsc, etc.

  @Column()
  network: string;    // mainnet or testnet

  @Column()
  networkVersion: string;  // NATIVE, ERC20, BEP20, etc.

  @Column({ type: 'int', nullable: true })
  blockNumber: number;

  @Column({ type: 'int', default: 0 })
  confirmations: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirming', 'confirmed', 'failed'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    from: string;
    contractAddress?: string;
    blockHash?: string;
    fee?: string;
    memo?: string;
    tag?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 