import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';

@Injectable()
export class KYCService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private readonly kycLevelRepository: Repository<KYCLevel>,
  ) {}

  async getUserKYCDetails(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['kycLevelDetails'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      currentLevel: user.kycLevel,
      levelDetails: user.kycLevelDetails,
      userDetails: {
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
      kycData: user.kycData,
    };
  }

  async getAllKYCLevels() {
    return this.kycLevelRepository.find({
      order: { level: 'ASC' },
    });
  }
} 