import { Controller, Get, Query, UseGuards, Param, NotFoundException, Post, BadRequestException, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { Deposit } from '../wallet/entities/deposit.entity';
import { Token } from '../wallet/entities/token.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Decimal } from 'decimal.js';
import { User } from '../auth/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';

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
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
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
            query.where(
                'deposit.txHash ILIKE :search OR CAST(deposit.id AS TEXT) ILIKE :search OR CAST(deposit.userId AS TEXT) ILIKE :search',
                { search: `%${search}%` }
            );
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

    @Post('tokens/:id/sync-wallets')
    async syncTokenWallets(@Param('id') tokenId: string) {
        // Get the token and its variants with same baseSymbol
        const token = await this.tokenRepository.findOne({
            where: { id: tokenId }
        });

        if (!token) {
            throw new NotFoundException('Token not found');
        }

        // Get all tokens with same baseSymbol
        const tokenVariants = await this.tokenRepository.find({
            where: { baseSymbol: token.baseSymbol || token.symbol }
        });

        // Get all users and their wallets
        const users = await this.userRepository.find();
        const totalUsers = users.length;
        const walletTypes = ['funding', 'spot'] as const;
        const results = { funding: { existing: 0, created: 0 }, spot: { existing: 0, created: 0 } };

        // Process each wallet type
        for (const type of walletTypes) {
            // Get existing wallet balances for this token and type
            const existingBalances = await this.walletBalanceRepository.find({
                where: {
                    baseSymbol: token.baseSymbol || token.symbol,
                    type
                }
            });

            results[type].existing = existingBalances.length;

            // Find users who don't have a balance for this token and type
            const usersWithoutBalance = users.filter(user => 
                !existingBalances.some(balance => balance.userId === user.id)
            );

            // Create wallet balances for users who don't have one
            const newBalances = [];
            
            for (const user of usersWithoutBalance) {
                // Get user's wallets
                const userWallets = await this.walletRepository.find({
                    where: { userId: user.id }
                });

                // Build networks metadata
                const networks = {};
                
                // Build metadata for each token variant
                for (const tokenVariant of tokenVariants) {
                    // Find matching wallets for this token's blockchain
                    const matchingWallets = userWallets.filter(w => 
                        w.blockchain === tokenVariant.blockchain
                    );

                    for (const wallet of matchingWallets) {
                        const networkKey = `${tokenVariant.blockchain}_${wallet.network}`;
                        networks[networkKey] = {
                            walletId: wallet.id,
                            tokenId: tokenVariant.id,
                            networkVersion: tokenVariant.networkVersion,
                            contractAddress: tokenVariant.contractAddress,
                            network: wallet.network
                        };
                    }
                }

                // Only create if we have network metadata
                if (Object.keys(networks).length > 0) {
                    const balance = this.walletBalanceRepository.create({
                        userId: user.id,
                        baseSymbol: token.baseSymbol || token.symbol,
                        type,
                        balance: '0',
                        metadata: { networks }
                    });
                    newBalances.push(balance);
                }
            }

            if (newBalances.length > 0) {
                await this.walletBalanceRepository.save(newBalances);
            }

            results[type].created = newBalances.length;
        }

        return {
            message: `Sync complete for ${token.symbol}:`,
            details: {
                totalUsers,
                funding: {
                    existingBalances: results.funding.existing,
                    newBalancesCreated: results.funding.created,
                    allUsersHaveBalance: results.funding.created === 0
                },
                spot: {
                    existingBalances: results.spot.existing,
                    newBalancesCreated: results.spot.created,
                    allUsersHaveBalance: results.spot.created === 0
                }
            }
        };
    }

    @Post('tokens/:id/sync-networks')
    async syncTokenNetworks(@Param('id') tokenId: string) {
        // Get the token and its variants with same baseSymbol
        const token = await this.tokenRepository.findOne({
            where: { id: tokenId }
        });

        if (!token) {
            throw new NotFoundException('Token not found');
        }

        // Get all tokens with same baseSymbol
        const tokenVariants = await this.tokenRepository.find({
            where: { baseSymbol: token.baseSymbol || token.symbol }
        });

        const walletTypes = ['funding', 'spot'] as const;
        const results = { funding: { updated: 0 }, spot: { updated: 0 } };

        // Process each wallet type
        for (const type of walletTypes) {
            // Get all existing wallet balances for this token and type
            const existingBalances = await this.walletBalanceRepository.find({
                where: {
                    baseSymbol: token.baseSymbol || token.symbol,
                    type
                }
            });

            // Update each balance's network metadata
            for (const balance of existingBalances) {
                // Get user's wallets
                const userWallets = await this.walletRepository.find({
                    where: { userId: balance.userId }
                });

                // Build fresh networks metadata
                const networks = {};
                
                // Build metadata for each token variant
                for (const tokenVariant of tokenVariants) {
                    // Find matching wallets for this token's blockchain
                    const matchingWallets = userWallets.filter(w => 
                        w.blockchain === tokenVariant.blockchain
                    );

                    for (const wallet of matchingWallets) {
                        const networkKey = `${tokenVariant.blockchain}_${wallet.network}`;
                        networks[networkKey] = {
                            walletId: wallet.id,
                            tokenId: tokenVariant.id,
                            networkVersion: tokenVariant.networkVersion,
                            contractAddress: tokenVariant.contractAddress,
                            network: wallet.network
                        };
                    }
                }

                // Update the balance metadata
                balance.metadata = { networks };
                await this.walletBalanceRepository.save(balance);
                results[type].updated++;
            }
        }

        return {
            message: `Network sync complete for ${token.symbol}:`,
            details: {
                funding: {
                    balancesUpdated: results.funding.updated
                },
                spot: {
                    balancesUpdated: results.spot.updated
                }
            }
        };
    }
} 