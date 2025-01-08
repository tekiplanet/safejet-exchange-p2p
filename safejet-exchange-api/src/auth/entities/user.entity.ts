import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KYCLevel } from './kyc-level.entity';

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
  kycData: {
    phoneVerified?: boolean;
    identityVerified?: boolean;
    addressVerified?: boolean;
    videoVerified?: boolean;
    verificationCompletedAt?: Date;
    sumsubApplicantId?: string;
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
        status: 'pending' | 'processing' | 'completed' | 'failed';
        documentType?: string;
        lastAttempt?: Date;
        failureReason?: string;
        reviewAnswer?: string;
        reviewRejectType?: string;
        reviewRejectDetails?: string;
      };
      address?: {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        documentType?: string;
        lastAttempt?: Date;
        failureReason?: string;
      };
    };
    documents?: {
      idCard?: string;
      proofOfAddress?: string;
      selfie?: string;
    };
  };
} 