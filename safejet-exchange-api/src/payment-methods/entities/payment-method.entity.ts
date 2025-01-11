import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PaymentMethodType } from './payment-method-type.entity';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  paymentMethodTypeId: string;

  @ManyToOne(() => PaymentMethodType)
  @JoinColumn({ name: 'paymentMethodTypeId' })
  paymentMethodType: PaymentMethodType;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'jsonb' })
  details: Record<string, any>;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
