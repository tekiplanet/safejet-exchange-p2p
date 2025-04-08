import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';

export enum NewsType {
  ANNOUNCEMENT = 'announcement',
  MARKET_UPDATE = 'marketUpdate',
  ALERT = 'alert',
}

export enum NewsPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

@Entity('news_and_updates')
export class News {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NewsType,
  })
  type: NewsType;

  @Column({
    type: 'enum',
    enum: NewsPriority,
  })
  priority: NewsPriority;

  @Column()
  title: string;

  @Column({ length: 255 })
  shortDescription: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  externalLink: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'createdBy' })
  creator: Admin;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'updatedBy' })
  updater: Admin;
} 