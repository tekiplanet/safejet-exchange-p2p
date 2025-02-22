import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Token } from './token.entity';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  tokenId: string;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'enum', enum: ['spot', 'funding'] })
  fromType: 'spot' | 'funding';

  @Column({ type: 'enum', enum: ['spot', 'funding'] })
  toType: 'spot' | 'funding';

  @Column({ 
    type: 'varchar',
    default: 'completed'
  })
  status: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Token)
  @JoinColumn({ name: 'tokenId' })
  token: Token;
} 