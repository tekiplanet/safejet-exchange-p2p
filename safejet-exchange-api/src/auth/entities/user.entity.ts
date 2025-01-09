import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KYCLevel } from './kyc-level.entity';

export interface KYCData {
  sumsubApplicantId?: string;
  phoneVerified?: boolean;
  identityVerified?: boolean;
  addressVerified?: boolean;
  videoVerified?: boolean;
  verificationCompletedAt?: Date;
  identityDetails?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    country: string;
    submittedAt: Date;
  };
  verificationStatus?: {
    identity?: {
      status: 'processing' | 'pending' | 'completed' | 'failed';
      documentType?: string;
      lastAttempt?: Date;
      failureReason?: string;
      reviewAnswer?: 'GREEN' | 'RED' | 'ON_HOLD';
      reviewRejectType?: 'RETRY' | 'FINAL';
      reviewRejectDetails?: string;
      moderationComment?: string;
      clientComment?: string;
    };
    address?: {
      status: 'processing' | 'pending' | 'completed' | 'failed';
      documentType?: string;
      lastAttempt?: Date;
    };
    advanced?: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      lastAttempt: Date;
      reviewAnswer?: 'GREEN' | 'RED';
      reviewRejectType?: 'RETRY' | 'FINAL';
      reviewRejectDetails?: string;
      moderationComment?: string;
      clientComment?: string;
    };
  };
  documents?: {
    idCard?: string;
    proofOfAddress?: string;
    selfie?: string;
  };
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  passwordHash: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ default: 0 })
  verificationLevel: number;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ nullable: true })
  verificationCodeExpires: Date;

  @Column({ nullable: true })
  passwordResetCode: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  twoFactorSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ nullable: true })
  twoFactorBackupCodes: string;

  @Column()
  fullName: string;

  @Column()
  countryCode: string;

  @Column()
  countryName: string;

  @Column()
  phoneWithoutCode: string;

  @Column({ default: 'USD' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 0 })
  kycLevel: number;

  @ManyToOne(() => KYCLevel)
  @JoinColumn({ name: 'kycLevelId' })
  kycLevelDetails: KYCLevel;

  @Column('json', { nullable: true })
  kycData: KYCData;
} 