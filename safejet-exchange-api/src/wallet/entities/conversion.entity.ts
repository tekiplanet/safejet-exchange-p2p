import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Token } from './token.entity';

@Entity('conversions')
export class Conversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  fromTokenId: string;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'fromTokenId' })
  fromToken: Token;

  @Column()
  toTokenId: string;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'toTokenId' })
  toToken: Token;

  @Column('decimal', { precision: 40, scale: 18 })
  fromAmount: number;

  @Column('decimal', { precision: 40, scale: 18 })
  toAmount: number;

  @Column('decimal', { precision: 40, scale: 18 })
  exchangeRate: number;

  @Column('decimal', { precision: 40, scale: 18 })
  feeAmount: number;

  @Column()
  feeType: string;

  @Column({ default: 'completed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 