import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('p2p_trader_settings')
export class P2PTraderSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: false })
  autoAcceptOrders: boolean;

  @Column({ default: true })
  onlyVerifiedUsers: boolean;

  @Column({ default: true })
  showOnlineStatus: boolean;

  @Column({ default: false })
  enableInstantTrade: boolean;

  @Column({ default: 'Africa/Lagos' })
  timezone: string;

  @Column('jsonb', { 
    name: 'auto_responses',
    nullable: true,
    default: () => `'[
      {
        "id": "1",
        "message": "I have made the payment, please check.",
        "type": "Payment"
      },
      {
        "id": "2",
        "message": "Please provide your payment details.",
        "type": "Request"
      },
      {
        "id": "3",
        "message": "Payment received, releasing crypto now.",
        "type": "Confirmation"
      },
      {
        "id": "4",
        "message": "Thank you for trading with me!",
        "type": "Thanks"
      }
    ]'` 
  })
  autoResponses: AutoResponse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface AutoResponse {
  id: string;
  message: string;
  type: string;
} 