import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('p2p_disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  initiatorId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ 
    type: 'enum',
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatorId' })
  initiator: User;
} 