import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethodType } from './payment-method-type.entity';

@Entity('payment_method_fields')
export class PaymentMethodField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  label: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  placeholder: string;

  @Column({ nullable: true })
  helpText: string;

  @Column({ type: 'json', nullable: true })
  validationRules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: 0 })
  order: number;

  @Column()
  paymentMethodTypeId: string;

  @ManyToOne(() => PaymentMethodType, (type) => type.fields)
  @JoinColumn({ name: 'paymentMethodTypeId' })
  paymentMethodType: PaymentMethodType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
