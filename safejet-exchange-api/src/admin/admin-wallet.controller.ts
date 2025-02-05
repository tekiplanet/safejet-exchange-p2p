import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AdminGuard } from '../auth/admin.guard';
import { Token } from '../wallet/entities/token.entity';
import { In } from 'typeorm';

@Controller('admin/wallet-balances')
@UseGuards(AdminGuard)
export class AdminWalletController {
    private readonly logger = new Logger(AdminWalletController.name);

    constructor(
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
    ) {}

    @Get('summary/:userId')
    async getUserBalanceSummary(@Param('userId') userId: string) {
        this.logger.debug(`Fetching wallet balance summary for user: ${userId}`);
        
        // Get all user balances
        const balances = await this.walletBalanceRepository.find({
            where: { userId }
        });

        // Get all required tokens
        const tokenSymbols = [...new Set(balances.map(b => b.baseSymbol))];
        const tokens = await this.tokenRepository.find({
            where: { baseSymbol: In(tokenSymbols) }
        });

        // Create price lookup map
        const tokenPrices = tokens.reduce((acc, token) => {
            acc[token.baseSymbol] = token.currentPrice;
            return acc;
        }, {} as Record<string, number>);

        // Calculate USD totals
        const summary = balances.reduce((acc, balance) => {
            const amount = parseFloat(balance.balance) || 0;
            const price = tokenPrices[balance.baseSymbol] || 0;
            const usdValue = amount * price;

            if (balance.type === 'spot') {
                acc.totalSpot += usdValue;
            } else if (balance.type === 'funding') {
                acc.totalFunding += usdValue;
            }
            return acc;
        }, { totalSpot: 0, totalFunding: 0 });

        this.logger.debug('Balance summary with USD values:', summary);
        return summary;
    }

    @Get(':userId')
    async getUserBalances(@Param('userId') userId: string) {
        this.logger.debug(`Fetching wallet balances for user: ${userId}`);
        
        const balances = await this.walletBalanceRepository.find({
            where: { userId },
            order: { baseSymbol: 'ASC' }
        });

        this.logger.debug(`Found ${balances.length} balances for user ${userId}`);
        this.logger.debug('Raw balances:', balances);

        // Group balances by symbol
        const groupedBalances = balances.reduce((acc, balance) => {
            if (!acc[balance.baseSymbol]) {
                acc[balance.baseSymbol] = { spot: '0', funding: '0' };
            }
            acc[balance.baseSymbol][balance.type] = balance.balance;
            return acc;
        }, {} as Record<string, { spot: string; funding: string }>);

        this.logger.debug('Grouped balances:', groupedBalances);
        return groupedBalances;
    }
} 