import { Controller, Get, Param, UseGuards, Logger, Query, Post, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AdminGuard } from '../auth/admin.guard';
import { Token } from '../wallet/entities/token.entity';
import { In } from 'typeorm';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Decimal } from 'decimal.js';

@Controller('admin/wallet-balances')
@UseGuards(AdminGuard)
export class AdminWalletController {
    private readonly logger = new Logger(AdminWalletController.name);

    constructor(
        @InjectRepository(WalletBalance)
        private walletBalanceRepository: Repository<WalletBalance>,
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>,
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
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
            where: { baseSymbol: In(tokenSymbols) },
            select: ['baseSymbol', 'currentPrice', 'metadata']
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
            const token = tokens.find(t => t.baseSymbol === balance.symbol);
            acc[balance.symbol] = {
                spot: balance.spot,
                funding: balance.funding,
                spotUsdValue: balance.spotUsdValue,
                fundingUsdValue: balance.fundingUsdValue,
                metadata: token?.metadata || {}
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

    @Post('sync/:userId')
    async syncUserWallets(@Param('userId') userId: string) {
        this.logger.debug(`Syncing wallet balances for user: ${userId}`);

        // Get ALL tokens
        const tokens = await this.tokenRepository.find({
            where: { isActive: true }
        });

        // Get existing balances
        const existingBalances = await this.walletBalanceRepository.find({
            where: { userId }
        });

        // Get user's wallets
        const userWallets = await this.walletRepository.find({
            where: { userId }
        });

        // Group tokens by baseSymbol
        const tokenGroups = tokens.reduce<Record<string, Token[]>>((groups, token) => {
            const baseSymbol = token.baseSymbol || token.symbol;
            if (!groups[baseSymbol]) {
                groups[baseSymbol] = [];
            }
            groups[baseSymbol].push(token);
            return groups;
        }, {});

        const newBalances: WalletBalance[] = [];
        const existingSymbols = new Set(existingBalances.map(b => b.baseSymbol));

        // Process each token group that doesn't exist yet
        for (const [baseSymbol, groupTokens] of Object.entries(tokenGroups)) {
            if (existingSymbols.has(baseSymbol)) continue;

            const types: ('spot' | 'funding')[] = ['spot', 'funding'];
            
            for (const type of types) {
                try {
                    // Build networks metadata
                    const networks = {};
                    
                    // Build metadata for each token variant
                    for (const token of groupTokens) {
                        // Find matching wallets for this token's blockchain
                        const matchingWallets = userWallets.filter(w => 
                            w.blockchain === token.blockchain
                        );

                        for (const wallet of matchingWallets) {
                            const networkKey = `${token.blockchain}_${wallet.network}`;
                            networks[networkKey] = {
                                walletId: wallet.id,
                                tokenId: token.id,
                                networkVersion: token.networkVersion,
                                contractAddress: token.contractAddress,
                                network: wallet.network
                            };
                        }
                    }

                    // Only create if we have network metadata
                    if (Object.keys(networks).length > 0) {
                        const balance = new WalletBalance();
                        balance.userId = userId;
                        balance.baseSymbol = baseSymbol;
                        balance.type = type;
                        balance.balance = '0';
                        balance.metadata = { networks };
                        newBalances.push(balance);
                    }
                } catch (error) {
                    this.logger.error(`Failed to create balance for ${baseSymbol}:`, error);
                }
            }
        }

        if (newBalances.length > 0) {
            await this.walletBalanceRepository.save(newBalances);
            return {
                message: `Successfully synced ${newBalances.length / 2} new tokens`,
                details: {
                    newTokens: [...new Set(newBalances.map(b => b.baseSymbol))].sort(),
                    totalCreated: newBalances.length,
                    spotBalances: newBalances.filter(b => b.type === 'spot').length,
                    fundingBalances: newBalances.filter(b => b.type === 'funding').length
                }
            };
        } else {
            return {
                message: 'No new tokens to sync. User wallet balances are up to date.',
                details: {
                    newTokens: [],
                    totalCreated: 0,
                    spotBalances: 0,
                    fundingBalances: 0
                }
            };
        }
    }

    @Get('addresses/:userId')
    async getUserWalletAddresses(@Param('userId') userId: string) {
        const wallets = await this.walletRepository.find({
            where: { userId },
            select: ['blockchain', 'network', 'address', 'memo', 'tag']
        });

        // Group by blockchain for better organization
        const groupedWallets = wallets.reduce((acc, wallet) => {
            if (!acc[wallet.blockchain]) {
                acc[wallet.blockchain] = [];
            }
            acc[wallet.blockchain].push({
                network: wallet.network,
                address: wallet.address,
                memo: wallet.memo,
                tag: wallet.tag
            });
            return acc;
        }, {} as Record<string, Array<{
            network: string;
            address: string;
            memo?: string;
            tag?: string;
        }>>);

        return groupedWallets;
    }

    @Post(':userId/adjust-balance')
    async adjustUserBalance(
        @Param('userId') userId: string,
        @Body() adjustmentDto: {
            baseSymbol: string;
            type: 'spot' | 'funding';
            action: 'add' | 'deduct';
            amount: string;
        }
    ) {
        this.logger.debug(`Adjusting balance for user ${userId}:`, adjustmentDto);

        const balance = await this.walletBalanceRepository.findOne({
            where: {
                userId,
                baseSymbol: adjustmentDto.baseSymbol,
                type: adjustmentDto.type
            }
        });

        if (!balance) {
            throw new NotFoundException(`Balance not found for ${adjustmentDto.baseSymbol}`);
        }

        const currentBalance = new Decimal(balance.balance);
        const adjustAmount = new Decimal(adjustmentDto.amount);

        if (adjustmentDto.action === 'deduct' && currentBalance.lessThan(adjustAmount)) {
            throw new BadRequestException('Insufficient balance for deduction');
        }

        balance.balance = adjustmentDto.action === 'add' 
            ? currentBalance.plus(adjustAmount).toString()
            : currentBalance.minus(adjustAmount).toString();

        await this.walletBalanceRepository.save(balance);

        return {
            message: `Successfully ${adjustmentDto.action}ed ${adjustmentDto.amount} ${adjustmentDto.baseSymbol} to ${adjustmentDto.type} balance`,
            newBalance: balance.balance
        };
    }
} 