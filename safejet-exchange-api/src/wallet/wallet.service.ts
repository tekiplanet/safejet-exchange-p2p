import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { KeyManagementService } from './key-management.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { Token } from './entities/token.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { tokenSeeds } from './seeds/tokens.seed';
import { ExchangeService } from '../exchange/exchange.service';
import { Logger } from '@nestjs/common';

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(WalletBalance)
    private walletBalanceRepository: Repository<WalletBalance>,
    private keyManagementService: KeyManagementService,
    private readonly exchangeService: ExchangeService,
  ) {}

  async createWallet(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    // Check if active wallet exists for this blockchain and network
    const existingWallet = await this.walletRepository.findOne({
      where: {
        userId,
        blockchain: createWalletDto.blockchain,
        network: createWalletDto.network,
        status: 'active',
      },
    });

    if (existingWallet) {
      throw new BadRequestException(
        `Active wallet already exists for ${createWalletDto.blockchain} on ${createWalletDto.network}`
      );
    }

    // Generate wallet
    const { address, keyId } = await this.keyManagementService.generateWallet(
      userId,
      createWalletDto.blockchain,
      createWalletDto.network,
    );

    // Create wallet record
    const wallet = await this.walletRepository.save({
      userId,
      blockchain: createWalletDto.blockchain,
      network: createWalletDto.network,
      address,
      keyId,
      metadata: {
        createdAt: new Date().toISOString(),
        network: createWalletDto.network,
      },
    });

    // Initialize balances for all tokens of this blockchain
    await this.initializeWalletBalances(wallet);

    return wallet;
  }

  private async initializeWalletBalances(wallet: Wallet) {
    // Get all tokens for this blockchain and network using QueryBuilder
    const tokens = await this.tokenRepository
      .createQueryBuilder('token')
      .where('token.blockchain = :blockchain', { blockchain: wallet.blockchain })
      .andWhere(`token.metadata::jsonb @> :networks`, { 
        networks: { networks: [wallet.network === 'mainnet' ? 'mainnet' : 'testnet'] }
      })
      .getMany();

      console.log(`Found ${tokens.length} tokens for ${wallet.blockchain} on ${wallet.network}`);
      console.log('Tokens:', tokens.map(t => t.symbol).join(', '));

    // Create initial balance entries for both spot and funding
    const balancePromises = tokens.flatMap(token => {
      const types: ('spot' | 'funding')[] = ['spot', 'funding'];
      
      return types.map(type => 
        this.walletBalanceRepository.save({
          walletId: wallet.id,
          tokenId: token.id,
          balance: '0',
          type,
          metadata: {
            createdAt: new Date().toISOString(),
            network: wallet.network
          }
        })
      );
    });

    try {
      await Promise.all(balancePromises);
      console.log(`Successfully initialized ${balancePromises.length} balances for wallet ${wallet.id}`);
    } catch (error) {
      console.error('Error initializing wallet balances:', error);
      throw new Error(`Failed to initialize wallet balances: ${error.message}`);
    }
  }

  // Add method to check if balances exist and create if missing
  async ensureWalletBalances(walletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId }
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const existingBalances = await this.walletBalanceRepository.find({
      where: { walletId }
    });

    if (existingBalances.length === 0) {
      await this.initializeWalletBalances(wallet);
    }
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId, status: 'active' },
    });
  }

  async getWallet(userId: string, walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  // Get all balances for a wallet
  async getWalletBalances(
    userId: string, 
    walletId: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance[]> {
    const wallet = await this.getWallet(userId, walletId);

    return this.walletBalanceRepository.find({
      where: {
        walletId: wallet.id,
        type,
      },
      relations: ['token'],
    });
  }

  // Get specific token balance
  async getTokenBalance(
    userId: string,
    walletId: string,
    tokenId: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance> {
    const wallet = await this.getWallet(userId, walletId);

    return this.walletBalanceRepository.findOne({
      where: {
        walletId: wallet.id,
        tokenId,
        type,
      },
      relations: ['token'],
    });
  }

  // Update balance
  async updateBalance(
    userId: string,
    walletId: string,
    tokenId: string,
    amount: string,
    type: 'spot' | 'funding' = 'spot'
  ): Promise<WalletBalance> {
    const wallet = await this.getWallet(userId, walletId);
    
    let balance = await this.walletBalanceRepository.findOne({
      where: {
        walletId: wallet.id,
        tokenId,
        type,
      },
    });

    if (!balance) {
      balance = this.walletBalanceRepository.create({
        walletId: wallet.id,
        tokenId,
        balance: '0',
        type,
      });
    }

    balance.balance = amount;
    return this.walletBalanceRepository.save(balance);
  }

  async seedTokens() {
    for (const tokenData of tokenSeeds) {
      const existingToken = await this.tokenRepository.findOne({
        where: {
          blockchain: tokenData.blockchain,
          symbol: tokenData.symbol,
          contractAddress: tokenData.contractAddress,
        },
      });

      if (!existingToken) {
        await this.tokenRepository.save(tokenData);
      }
    }
  }

  async getBalances(
    userId: string, 
    type?: string, 
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<any> {
    try {
      const page = Math.max(1, Math.floor(Number(pagination.page)));
      const limit = Math.max(1, Math.floor(Number(pagination.limit)));
      
      const wallets = await this.walletRepository.find({
        where: { userId, status: 'active' }
      });

      if (!wallets || wallets.length === 0) {
        return {
          balances: [],
          total: 0,
          change24h: 0,
          changePercent24h: 0,
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasMore: false,
          }
        };
      }

      const walletIds = wallets.map(w => w.id);
      const query = this.walletBalanceRepository
        .createQueryBuilder('balance')
        .where('balance.walletId IN (:...walletIds)', { walletIds })
        .leftJoinAndSelect('balance.token', 'token')
        .orderBy('token.symbol', 'ASC');

      if (type) {
        // For spot or funding, apply normal pagination
        query.andWhere('balance.type = :type', { type });
        
        const skip = (page - 1) * limit;
        const [balances, total] = await Promise.all([
          query.skip(skip).take(limit).getMany(),
          query.getCount(),
        ]);

        const uniqueTokens = [...new Set(balances.map(b => b.token))];
        const symbols = uniqueTokens.map(token => token.symbol);
        const prices = await this.exchangeService.getBatchPrices(symbols);

        const processedBalances = balances.map(balance => ({
          id: balance.id,
          balance: balance.balance,
          type: balance.type,
          token: balance.token,
          price: prices[balance.token.symbol] || 0,
          metadata: balance.metadata
        }));

        return {
          balances: processedBalances,
          total: this.calculateTotal(processedBalances),
          change24h: 0,
          changePercent24h: 0,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          }
        };
      } else {
        // For "All", get all balances first then combine
        const allBalances = await query.getMany();
        
        // Combine spot and funding balances for each token
        const combinedBalances = new Map<string, any>();
        
        allBalances.forEach(balance => {
          const tokenSymbol = balance.token.symbol;
          const currentBalance = parseFloat(balance.balance) || 0;
          
          if (combinedBalances.has(tokenSymbol)) {
            const existing = combinedBalances.get(tokenSymbol);
            existing.balance = (parseFloat(existing.balance) + currentBalance).toString();
          } else {
            combinedBalances.set(tokenSymbol, {
              id: balance.id,
              balance: balance.balance,
              token: balance.token,
              type: 'all' // Mark as combined balance
            });
          }
        });

        // Convert to array and sort
        let processedBalances = Array.from(combinedBalances.values());
        
        // Get prices for all tokens
        const symbols = processedBalances.map(b => b.token.symbol);
        const prices = await this.exchangeService.getBatchPrices(symbols);
        
        // Add prices to balances
        processedBalances = processedBalances.map(balance => ({
          ...balance,
          price: prices[balance.token.symbol] || 0
        }));

        // Apply pagination to combined results
        const total = processedBalances.length;
        const start = (page - 1) * limit;
        const paginatedBalances = processedBalances.slice(start, start + limit);

        return {
          balances: paginatedBalances,
          total: this.calculateTotal(processedBalances), // Calculate total from all balances
          change24h: 0,
          changePercent24h: 0,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          }
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get balances: ${error.message}`);
      throw error;
    }
  }

  async getTotalBalance(userId: string, currency: string, type?: string): Promise<number> {
    try {
      // Get balances filtered by type if specified
      const data = await this.getBalances(userId, type);
      
      // If data already has total, use it
      if (data.total !== undefined) {
        // Only convert if currency is not USD
        if (currency.toUpperCase() === 'USD') {
          return data.total;
        }
        const exchangeRate = await this.exchangeService.getRateForCurrency(currency);
        return data.total * exchangeRate.rate;
      }

      // Otherwise calculate total from balances (for backward compatibility)
      const balances = Array.isArray(data) ? data : data.balances;
      
      // Only get exchange rate if currency is not USD
      const exchangeRate = currency.toUpperCase() === 'USD' 
        ? { rate: 1 } 
        : await this.exchangeService.getRateForCurrency(currency);

      // Get current prices for all tokens
      const tokenPrices = await this.getTokenPrices(balances.map(b => b.token));

      return balances.reduce((total, balance) => {
        const balanceAmount = parseFloat(balance.balance);
        const tokenPrice = tokenPrices[balance.token.symbol] ?? 0;
        
        // Calculate USD value first
        const usdValue = balanceAmount * tokenPrice;
        
        // Convert to target currency
        return total + (usdValue * exchangeRate.rate);
      }, 0);
    } catch (error) {
      this.logger.error(`Failed to calculate total balance: ${error.message}`);
      throw new Error('Failed to calculate total balance');
    }
  }

  private async getTokenPrices(tokens: Token[]): Promise<Record<string, number>> {
    try {
      // Get unique tokens to avoid duplicate requests
      const uniqueTokens = tokens.filter((token, index, self) =>
        index === self.findIndex((t) => t.symbol === token.symbol)
      );

      const prices: Record<string, number> = {};

      // Get all prices in parallel using direct crypto price API
      await Promise.all(
        uniqueTokens.map(async token => {
          try {
            // Always get price in USD first
            const price = await this.exchangeService.getCryptoPrice(token.symbol, 'USD');
            prices[token.symbol] = price;
          } catch (error) {
            this.logger.warn(`Failed to get price for ${token.symbol}: ${error.message}`);
            prices[token.symbol] = 0;
          }
        })
      );

      return prices;
    } catch (error) {
      this.logger.error(`Failed to get token prices: ${error.message}`);
      throw error;
    }
  }

  private calculateTotal(balances: any[]): number {
    return balances.reduce((total, balance) => {
      const amount = parseFloat(balance.balance) || 0;
      const price = balance.price || 0;
      return total + (amount * price);
    }, 0);
  }
} 