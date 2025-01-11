import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  Id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserId' })
  User: User;

  @Column()
  UserId: string;

  @Column()
  Name: string;

  @Column()
  Icon: string;

  @Column({ default: false })
  IsDefault: boolean;

  @Column({ default: false })
  IsVerified: boolean;

  @Column('jsonb')
  Details: Record<string, any>;

  @CreateDateColumn()
  CreatedAt: Date;

  @UpdateDateColumn()
  UpdatedAt: Date;
} 