import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../wallet/entities/withdrawal.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Decimal } from 'decimal.js';

@Controller('admin/withdrawals')
@UseGuards(AdminGuard)
export class AdminWithdrawalsController {
  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WalletBalance)
    private walletBalanceRepository: Repository<WalletBalance>
  ) {}

  @Get()
  async getWithdrawals(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('blockchain') blockchain?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const query = this.withdrawalRepository.createQueryBuilder('withdrawal')
        .leftJoinAndSelect('withdrawal.user', 'user')
        .leftJoinAndSelect('withdrawal.token', 'token');

      if (search) {
        query.andWhere('(withdrawal.txHash ILIKE :search OR withdrawal.userId ILIKE :search OR withdrawal.id ILIKE :search)', {
          search: `%${search}%`
        });
      }

      if (status) {
        query.andWhere('withdrawal.status = :status', { status });
      }

      if (blockchain) {
        query.andWhere('withdrawal.network = :blockchain', { blockchain });
      }

      const [withdrawals, total] = await Promise.all([
        query
          .orderBy('withdrawal.createdAt', 'DESC')
          .skip(skip)
          .take(limit)
          .getMany(),
        query.getCount()
      ]);

      return {
        data: withdrawals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  }

  @Get(':id')
  async getWithdrawal(@Param('id') id: string): Promise<Withdrawal> {
    return this.withdrawalRepository.findOne({
      where: { id },
      relations: ['user', 'token']
    });
  }

  @Post(':id/process')
  async processWithdrawal(
    @Param('id') id: string,
    @Body() data: { status: 'completed' | 'failed' | 'cancelled'; reason?: string }
  ) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['user', 'token']
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    // Update withdrawal status
    withdrawal.status = data.status;
    if (data.reason) {
      withdrawal.metadata = {
        ...withdrawal.metadata,
        processingReason: data.reason
      };
    }

    // If failed or cancelled, refund the amount
    if (data.status === 'failed' || data.status === 'cancelled') {
      const balance = await this.walletBalanceRepository.findOne({
        where: {
          userId: withdrawal.userId,
          baseSymbol: withdrawal.token.baseSymbol,
          type: 'funding'
        }
      });

      if (balance) {
        const totalAmount = new Decimal(withdrawal.amount).plus(new Decimal(withdrawal.fee));
        balance.balance = new Decimal(balance.balance).plus(totalAmount).toString();
        await this.walletBalanceRepository.save(balance);
      }
    }

    return this.withdrawalRepository.save(withdrawal);
  }
} 