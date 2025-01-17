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

  @Column({ nullable: true })
  contractAddress: string; // null for native tokens

  @Column()
  decimals: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // For additional token info

  @Column({ nullable: true })
  baseSymbol: string;  // e.g., "USDT" for all USDT versions

  @Column({ nullable: true })
  networkVersion: string;  // e.g., "ERC20", "TRC20", "BEP20"

  @Column({ default: true })
  isActive: boolean;

  @Column('numeric', { precision: 40, scale: 18, default: 0 })
  currentPrice: number;

  @Column('numeric', { precision: 40, scale: 18, default: 0 })
  price24h: number;

  @Column('numeric', { precision: 40, scale: 18, default: 0 })
  changePercent24h: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastPriceUpdate: Date;

  @Column({ type: 'decimal', nullable: true })
  marketCap: number;

  @Column({ type: 'decimal', nullable: true })
  fullyDilutedMarketCap: number;

  @Column({ type: 'decimal', nullable: true })
  volume24h: number;

  @Column({ type: 'decimal', nullable: true })
  circulatingSupply: number;

  @Column({ type: 'decimal', nullable: true })
  maxSupply: number;

  @Column({ type: 'decimal', nullable: true })
  marketCapChange24h: number;

  @Column({ type: 'decimal', nullable: true })
  marketCapChangePercent24h: number;

  @Column({ type: 'decimal', nullable: true })
  volumeChangePercent24h: number;

  @Column({ type: 'json', nullable: true })
  priceHistory: any;

  @Column({ nullable: true })
  coingeckoId: string;
} 