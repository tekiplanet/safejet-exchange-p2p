import { Controller, Get, Put, Query, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { KYCLevel } from '../entities/kyc-level.entity';
import { AdminGuard } from '../../auth/admin.guard';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsNumber()
  kycLevel?: number;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  notificationPreferences?: {
    P2P?: {
      'New Messages'?: boolean;
      'Order Status'?: boolean;
      'Dispute Updates'?: boolean;
      'Payment Confirmations'?: boolean;
    };
    Wallet?: {
      'Deposits'?: boolean;
      'Withdrawals'?: boolean;
      'Balance Updates'?: boolean;
      'Transfer Confirmations'?: boolean;
    };
    Trading?: {
      'Price Alerts'?: boolean;
      'Order Updates'?: boolean;
      'Market Updates'?: boolean;
      'Trade Confirmations'?: boolean;
    };
    Security?: {
      'Login Alerts'?: boolean;
      'Device Changes'?: boolean;
      'Password Changes'?: boolean;
      'Suspicious Activity'?: boolean;
    };
  };

  @IsOptional()
  @IsBoolean()
  forcePasswordReset?: boolean;
}

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private kycLevelRepository: Repository<KYCLevel>
  ) {}

  @Get()
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('kycLevel') kycLevel?: number,
    @Query('verified') verified?: 'email' | 'phone' | 'both'
  ) {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.kycLevelDetails', 'kycLevelDetails')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (kycLevel) {
      queryBuilder.andWhere('kycLevelDetails.level = :kycLevel', { kycLevel });
    }

    if (verified) {
      switch (verified) {
        case 'email':
          queryBuilder.andWhere('user.emailVerified = true');
          break;
        case 'phone':
          queryBuilder.andWhere('user.phoneVerified = true');
          break;
        case 'both':
          queryBuilder.andWhere('user.emailVerified = true AND user.phoneVerified = true');
          break;
      }
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['kycLevelDetails']
    });
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    try {
      const user = await this.userRepository.findOne({ 
        where: { id },
        relations: ['kycLevelDetails']
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      console.log('Updating user:', { id, updates: updateUserDto });

      // If updating KYC level, fetch the corresponding KYC level entity
      if (updateUserDto.kycLevel !== undefined) {
        const kycLevel = await this.kycLevelRepository.findOne({
          where: { level: updateUserDto.kycLevel }
        });
        
        if (!kycLevel) {
          console.log('KYC Level not found:', updateUserDto.kycLevel);
          throw new BadRequestException(`KYC Level ${updateUserDto.kycLevel} not found`);
        }
        
        user.kycLevelDetails = kycLevel;
        user.kycLevel = updateUserDto.kycLevel;
        delete updateUserDto.kycLevel;
      }

      // Update other fields
      Object.assign(user, updateUserDto);

      const savedUser = await this.userRepository.save(user);
      console.log('User updated successfully:', savedUser);

      return this.userRepository.findOne({
        where: { id },
        relations: ['kycLevelDetails']
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  @Get('export/csv')
  async exportUsers() {
    const users = await this.userRepository.find({
      relations: ['kycLevelDetails']
    });
    
    // Implement CSV export logic
    // Return CSV file
  }
} 