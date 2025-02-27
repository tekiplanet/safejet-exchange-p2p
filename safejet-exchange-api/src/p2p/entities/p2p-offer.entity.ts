import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('p2p_offers')
export class P2POffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: 'buy' | 'sell';

  @Column()
  tokenId: string;

  @Column('decimal', { precision: 18, scale: 8 })
  amount: number;

  @Column()
  currency: string;

  @Column('decimal', { precision: 18, scale: 8 })
  price: number;

  @Column('decimal', { precision: 18, scale: 8 })
  priceUSD: number;

  @Column('jsonb')
  paymentMethods: {
    typeId: string;
    methodId?: string;
  }[];

  @Column('text')
  terms: string;

  @Column()
  status: 'active' | 'pending' | 'completed' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 