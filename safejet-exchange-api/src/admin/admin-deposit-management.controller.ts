import { Controller, Get, Query, UseGuards, Param, NotFoundException, Post, BadRequestException, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { Deposit } from '../wallet/entities/deposit.entity';
import { Token } from '../wallet/entities/token.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Decimal } from 'decimal.js';

@Controller('admin/deposits')
@UseGuards(AdminGuard)
export class AdminDepositManagementController {
    constructor(
        @InjectRepository(Deposit)
        private depositRepository: Repository<Deposit>,
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
    ) {}

    @Get()
    async getDeposits(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('blockchain') blockchain?: string,
    ) {
        const query = this.depositRepository.createQueryBuilder('deposit');

        // Apply search if provided
        if (search) {
            query.where([
                { txHash: Like(`%${search}%`) },
                { userId: Like(`%${search}%`) },
            ]);
        }

        // Apply status filter
        if (status) {
            query.andWhere('deposit.status = :status', { status });
        }

        // Apply blockchain filter
        if (blockchain) {
            query.andWhere('deposit.blockchain = :blockchain', { blockchain });
        }

        // Add order by
        query.orderBy('deposit.createdAt', 'DESC');

        // Get total count
        const total = await query.getCount();

        // Apply pagination
        const deposits = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            data: deposits,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    @Get(':id')
    async getDeposit(@Param('id') id: string) {
        const deposit = await this.depositRepository.findOne({
            where: { id }
        });

        if (!deposit) {
            throw new NotFoundException('Deposit not found');
        }

        return deposit;
    }

    @Get('token-details/:tokenId')
    async getTokenDetails(@Param('tokenId') tokenId: string) {
        const token = await this.tokenRepository.findOne({
            where: { id: tokenId },
            select: ['id', 'symbol', 'name', 'blockchain', 'networkVersion']
        });

        if (!token) {
            throw new NotFoundException('Token not found');
        }

        return token;
    }

    @Post(':id/process')
    async processDeposit(
        @Param('id') id: string,
        @Body() data: { confirmations?: number }
    ) {
        const deposit = await this.depositRepository.findOne({
            where: { id }
        });

        if (!deposit) {
            throw new NotFoundException('Deposit not found');
        }

        if (deposit.status !== 'pending') {
            throw new BadRequestException('Only pending deposits can be processed');
        }

        // Get token to get baseSymbol
        const token = await this.tokenRepository.findOne({
            where: { id: deposit.tokenId }
        });

        if (!token) {
            throw new NotFoundException('Token not found');
        }

        // Get or create wallet balance using baseSymbol
        let walletBalance = await this.walletBalanceRepository.findOne({
            where: {
                userId: deposit.userId,
                baseSymbol: token.baseSymbol || token.symbol,
                type: 'funding'
            }
        });

        if (!walletBalance) {
            walletBalance = this.walletBalanceRepository.create({
                userId: deposit.userId,
                baseSymbol: token.baseSymbol || token.symbol,
                type: 'funding',
                balance: '0'
            });
        }

        // Add deposit amount to balance
        const currentBalance = new Decimal(walletBalance.balance || '0');
        const depositAmount = new Decimal(deposit.amount);
        walletBalance.balance = currentBalance.plus(depositAmount).toString();

        // Update deposit status
        deposit.status = 'confirmed';
        deposit.confirmations = data.confirmations || 10; // Use provided confirmations or default to 10

        // Save both changes in a transaction
        await this.depositRepository.manager.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.save(WalletBalance, walletBalance);
            await transactionalEntityManager.save(Deposit, deposit);
        });

        return { message: 'Deposit processed successfully', deposit };
    }
} 