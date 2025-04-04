import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Order } from './order.entity';

export enum MessageType {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  SYSTEM = 'SYSTEM',
}

@Entity('p2p_chat_messages')
export class P2PChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid', nullable: true })
  senderId: string | null;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isDelivered: boolean;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ nullable: true })
  attachmentType?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
} 