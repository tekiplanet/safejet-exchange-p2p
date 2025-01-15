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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 