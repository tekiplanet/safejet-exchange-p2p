import { Controller, Get, Param, UseGuards, Logger, Query, Post, Body, NotFoundException, BadRequestException, UnauthorizedException, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AdminGuard } from '../auth/admin.guard';
import { Token } from '../wallet/entities/token.entity';
import { In } from 'typeorm';
import { Wallet } from '../wallet/entities/wallet.entity';
import { Decimal } from 'decimal.js';
import { AdminWallet } from '../wallet/entities/admin-wallet.entity';
import { WalletKey } from '../wallet/entities/wallet-key.entity';
import { KeyManagementService } from '../wallet/key-management.service';
import { Admin } from '../admin/entities/admin.entity';
import * as bcrypt from 'bcrypt';

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
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        @InjectRepository(WalletKey)
        private walletKeyRepository: Repository<WalletKey>,
        @InjectRepository(Admin)
        private adminRepository: Repository<Admin>,
        private keyManagementService: KeyManagementService,
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
            const frozenAmount = parseFloat(balance.frozen) || 0;
            const price = tokenPrices[balance.baseSymbol] || 0;
            const usdValue = amount * price;
            const frozenUsdValue = frozenAmount * price;

            if (balance.type === 'spot') {
                acc.totalSpot += usdValue;
                acc.totalSpotFrozen += frozenUsdValue;
            } else if (balance.type === 'funding') {
                acc.totalFunding += usdValue;
                acc.totalFundingFrozen += frozenUsdValue;
            }
            return acc;
        }, { 
            totalSpot: 0, 
            totalFunding: 0,
            totalSpotFrozen: 0,
            totalFundingFrozen: 0
        });

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
                    fundingUsdValue: 0,
                    spotFrozen: '0',
                    fundingFrozen: '0',
                    spotFrozenUsdValue: 0,
                    fundingFrozenUsdValue: 0
                };
            }
            const price = tokenPrices[balance.baseSymbol] || 0;
            const amount = parseFloat(balance.balance) || 0;
            const frozenAmount = parseFloat(balance.frozen) || 0;
            const usdValue = amount * price;
            const frozenUsdValue = frozenAmount * price;

            if (balance.type === 'spot') {
                acc[balance.baseSymbol].spot = balance.balance;
                acc[balance.baseSymbol].spotUsdValue = usdValue;
                acc[balance.baseSymbol].spotFrozen = balance.frozen;
                acc[balance.baseSymbol].spotFrozenUsdValue = frozenUsdValue;
            } else {
                acc[balance.baseSymbol].funding = balance.balance;
                acc[balance.baseSymbol].fundingUsdValue = usdValue;
                acc[balance.baseSymbol].fundingFrozen = balance.frozen;
                acc[balance.baseSymbol].fundingFrozenUsdValue = frozenUsdValue;
            }
            return acc;
        }, {} as Record<string, { 
            spot: string; 
            funding: string;
            spotUsdValue: number;
            fundingUsdValue: number;
            spotFrozen: string;
            fundingFrozen: string;
            spotFrozenUsdValue: number;
            fundingFrozenUsdValue: number;
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
                spotFrozen: balance.spotFrozen,
                fundingFrozen: balance.fundingFrozen,
                spotFrozenUsdValue: balance.spotFrozenUsdValue,
                fundingFrozenUsdValue: balance.fundingFrozenUsdValue,
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
            action: 'add' | 'deduct' | 'freeze' | 'unfreeze';
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
        const currentFrozen = new Decimal(balance.frozen || '0');
        const adjustAmount = new Decimal(adjustmentDto.amount);

        switch (adjustmentDto.action) {
            case 'add':
                balance.balance = currentBalance.plus(adjustAmount).toString();
                break;

            case 'deduct':
                // Calculate available balance (total - frozen)
                const availableBalance = currentBalance.minus(currentFrozen);
                
                if (availableBalance.lessThan(adjustAmount)) {
                    throw new BadRequestException('Insufficient available balance for deduction');
                }
                
                balance.balance = currentBalance.minus(adjustAmount).toString();
                break;

            case 'freeze':
                // Check if there's enough available balance to freeze
                const availableToFreeze = currentBalance.minus(currentFrozen);
                
                if (availableToFreeze.lessThan(adjustAmount)) {
                    throw new BadRequestException('Insufficient available balance to freeze');
                }
                
                // Move amount from balance to frozen
                balance.balance = currentBalance.minus(adjustAmount).toString();
                balance.frozen = currentFrozen.plus(adjustAmount).toString();
                break;

            case 'unfreeze':
                // Check if there's enough frozen balance to unfreeze
                if (currentFrozen.lessThan(adjustAmount)) {
                    throw new BadRequestException('Insufficient frozen balance to unfreeze');
                }
                
                // Move amount from frozen back to balance
                balance.balance = currentBalance.plus(adjustAmount).toString();
                balance.frozen = currentFrozen.minus(adjustAmount).toString();
                break;
        }

        await this.walletBalanceRepository.save(balance);

        const actionMap = {
            add: 'added',
            deduct: 'deducted',
            freeze: 'frozen',
            unfreeze: 'unfrozen'
        };

        return {
            message: `Successfully ${actionMap[adjustmentDto.action]} ${adjustmentDto.amount} ${adjustmentDto.baseSymbol} ${adjustmentDto.type === 'spot' ? 'spot' : 'funding'} balance`,
            newBalance: balance.balance,
            newFrozen: balance.frozen
        };
    }

    @Post('decrypt-key/:walletId')
    async getDecryptedPrivateKey(
        @Param('walletId') walletId: string,
        @Body() body: { adminPassword: string; adminSecretKey: string },
        @Request() req: any
    ): Promise<{ privateKey: string }> {
        this.logger.debug(`Attempting to decrypt private key for admin wallet: ${walletId}`);

        // Get admin from database using the authenticated admin's ID
        const adminId = req.admin?.sub;
        if (!adminId) {
            throw new UnauthorizedException('Admin ID not found in token');
        }

        const admin = await this.adminRepository.findOne({ 
            where: { id: adminId }
        });

        if (!admin) {
            throw new UnauthorizedException('Admin account not found');
        }

        // Validate password using bcrypt
        const isPasswordValid = await bcrypt.compare(body.adminPassword, admin.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid master password');
        }

        // Verify admin secret key
        if (!body.adminSecretKey || body.adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
            throw new UnauthorizedException('Invalid secret key');
        }

        // Find the admin wallet
        const adminWallet = await this.adminWalletRepository.findOne({
            where: { id: walletId }
        });

        if (!adminWallet) {
            throw new NotFoundException('Admin wallet not found');
        }

        // Find the wallet key
        const walletKey = await this.walletKeyRepository.findOne({
            where: { id: adminWallet.keyId }
        });

        if (!walletKey) {
            throw new NotFoundException('Wallet key not found');
        }

        try {
            // Use the wallet's userId for decryption
            const privateKey = await this.keyManagementService.decryptPrivateKey(
                walletKey.encryptedPrivateKey,
                walletKey.userId // Use the wallet's userId instead of the secret key
            );

            return { privateKey };
        } catch (error) {
            this.logger.error('Failed to decrypt private key:', error);
            throw new BadRequestException('Failed to decrypt private key');
        }
    }
} 