import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  symbol: string; // e.g., 'ETH', 'USDT'

  @Column()
  name: string; // e.g., 'Ethereum', 'Tether USD'

  @Column()
  blockchain: string; // e.g., 'ethereum', 'bsc'

  @Column()
  contractAddress: string; // null for native tokens

  @Column()
  decimals: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // For additional token info
} 