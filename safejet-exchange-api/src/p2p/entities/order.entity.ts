import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { P2POffer } from './p2p-offer.entity';

@Entity('p2p_orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  offerId: string;

  @ManyToOne(() => P2POffer, { eager: true })
  @JoinColumn({ name: 'offerId' })
  offer: P2POffer;

  @Column('uuid')
  buyerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column('uuid')
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column('text')
  paymentMetadata: string;

  @Column('numeric', { precision: 24, scale: 8 })
  assetAmount: number;

  @Column('numeric', { precision: 24, scale: 8 })
  currencyAmount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'disputed', 'completed', 'cancelled'],
    default: 'pending',
  })
  buyerStatus: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'disputed', 'completed', 'cancelled'],
    default: 'pending',
  })
  sellerStatus: string;

  @Column({ type: 'varchar', unique: true })
  trackingId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paymentDeadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmationDeadline: Date;

  @Column('decimal', { precision: 24, scale: 8, nullable: true })
  price: number;
} 