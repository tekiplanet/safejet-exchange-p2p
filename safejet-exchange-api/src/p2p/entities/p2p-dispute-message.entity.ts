import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { P2PDispute } from './p2p-dispute.entity';
import { User } from '../../auth/entities/user.entity';

export enum DisputeMessageSenderType {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

@Entity('p2p_dispute_messages')
export class P2PDisputeMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  disputeId: string;

  @ManyToOne(() => P2PDispute)
  @JoinColumn({ name: 'disputeId' })
  dispute: P2PDispute;

  @Column({ nullable: true })
  senderId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({
    type: 'enum',
    enum: DisputeMessageSenderType,
    default: DisputeMessageSenderType.USER
  })
  senderType: DisputeMessageSenderType;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentType: string;

  @Column({ default: false })
  isDelivered: boolean;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
} 