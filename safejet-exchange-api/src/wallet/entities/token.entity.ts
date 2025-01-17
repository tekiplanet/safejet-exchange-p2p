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

  @Column({ type: 'decimal', precision: 24, scale: 8, default: 0 })
  currentPrice: number;

  @Column({ type: 'decimal', precision: 24, scale: 8, default: 0 })
  price24h: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  changePercent24h: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastPriceUpdate: Date;
} 