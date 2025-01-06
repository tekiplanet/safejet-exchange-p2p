import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('kyc_levels')
export class KYCLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  level: number;

  @Column()
  title: string;

  @Column('simple-array')
  requirements: string[];

  @Column('simple-array')
  benefits: string[];

  @Column('json')
  limits: {
    deposit: {
      daily: number;
      monthly: number;
    };
    withdrawal: {
      daily: number;
      monthly: number;
    };
    p2p: {
      daily: number;
      monthly: number;
    };
  };

  @Column('json')
  features: {
    canTrade: boolean;
    canDeposit: boolean;
    canWithdraw: boolean;
    canUseP2P: boolean;
    canUseFiat: boolean;
    hasVipSupport: boolean;
    hasReducedFees: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 