import { Controller, Get, Param, UseGuards, Logger, Query } from '@nestjs/common';
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
    async getUserBalances(
        @Param('userId') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
        @Query('hideZero') hideZero?: string,
        @Query('sortBy') sortBy: 'symbol' | 'spotValue' | 'fundingValue' = 'symbol',
        @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    ) {
        // First get ALL balances for the user
        const balances = await this.walletBalanceRepository.find({
            where: { userId },
            order: { baseSymbol: 'ASC' }
        });

        // Get token prices
        const tokenSymbols = [...new Set(balances.map(b => b.baseSymbol))];
        const tokens = await this.tokenRepository.find({
            where: { baseSymbol: In(tokenSymbols) }
        });

        const tokenPrices = tokens.reduce((acc, token) => {
            acc[token.baseSymbol] = token.currentPrice;
            return acc;
        }, {} as Record<string, number>);

        // Group ALL balances with USD values
        const groupedBalances = balances.reduce((acc, balance) => {
            if (!acc[balance.baseSymbol]) {
                acc[balance.baseSymbol] = { 
                    spot: '0', 
                    funding: '0',
                    spotUsdValue: 0,
                    fundingUsdValue: 0
                };
            }
            const price = tokenPrices[balance.baseSymbol] || 0;
            const amount = parseFloat(balance.balance) || 0;
            const usdValue = amount * price;

            if (balance.type === 'spot') {
                acc[balance.baseSymbol].spot = balance.balance;
                acc[balance.baseSymbol].spotUsdValue = usdValue;
            } else {
                acc[balance.baseSymbol].funding = balance.balance;
                acc[balance.baseSymbol].fundingUsdValue = usdValue;
            }
            return acc;
        }, {} as Record<string, { 
            spot: string; 
            funding: string;
            spotUsdValue: number;
            fundingUsdValue: number;
        }>);

        // Convert to array for easier filtering and pagination
        let balanceArray = Object.entries(groupedBalances).map(([symbol, balance]) => ({
            symbol,
            ...balance
        }));

        // Apply hide zero balances filter
        if (hideZero === 'true') {
            balanceArray = balanceArray.filter(balance => 
                parseFloat(balance.spot) > 0 || parseFloat(balance.funding) > 0
            );
        }

        // Apply search if provided
        if (search) {
            balanceArray = balanceArray.filter(balance => 
                balance.symbol.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply sorting
        balanceArray.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'spotValue':
                    comparison = a.spotUsdValue - b.spotUsdValue;
                    break;
                case 'fundingValue':
                    comparison = a.fundingUsdValue - b.fundingUsdValue;
                    break;
                default: // 'symbol'
                    comparison = a.symbol.localeCompare(b.symbol);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        // Get total count after search
        const total = balanceArray.length;

        // Apply pagination
        const paginatedBalances = balanceArray
            .slice((page - 1) * limit, page * limit);

        // Convert back to object format
        const paginatedData = paginatedBalances.reduce((acc, balance) => {
            acc[balance.symbol] = {
                spot: balance.spot,
                funding: balance.funding,
                spotUsdValue: balance.spotUsdValue,
                fundingUsdValue: balance.fundingUsdValue
            };
            return acc;
        }, {} as Record<string, any>);

        return {
            data: paginatedData,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
} 