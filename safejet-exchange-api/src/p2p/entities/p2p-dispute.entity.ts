import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../auth/entities/user.entity';

export enum DisputeReasonType {
  PAYMENT_ISSUE = 'payment_issue',
  FRAUD = 'fraud',
  TECHNICAL_ISSUE = 'technical_issue',
  BUYER_NOT_PAID = 'buyer_not_paid',
  SELLER_NOT_RELEASED = 'seller_not_released',
  WRONG_AMOUNT = 'wrong_amount',
  OTHER = 'other'
}

export enum DisputeStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED_BUYER = 'resolved_buyer',
  RESOLVED_SELLER = 'resolved_seller',
  CLOSED = 'closed'
}

@Entity('p2p_disputes')
export class P2PDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  initiatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatorId' })
  initiator: User;

  @Column({ nullable: true })
  respondentId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'respondentId' })
  respondent: User;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: DisputeReasonType,
    default: DisputeReasonType.OTHER
  })
  reasonType: DisputeReasonType;

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.PENDING
  })
  status: DisputeStatus;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  adminId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;
} 