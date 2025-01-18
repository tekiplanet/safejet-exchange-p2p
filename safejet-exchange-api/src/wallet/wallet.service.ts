import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Raw } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { KeyManagementService } from './key-management.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { Token } from './entities/token.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { tokenSeeds } from './seeds/tokens.seed';
import { ExchangeService } from '../exchange/exchange.service';
import { Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { delay } from '../utils/helpers';
import { chunk } from 'lodash';

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly cryptoCompareApi = 'https://min-api.cryptocompare.com/data';
  private readonly API_KEY = process.env.CRYPTOCOMPARE_API_KEY;
  private readonly BATCH_SIZE = 10;
  private readonly RATE_LIMIT_DELAY = 1000;
  private readonly BATCH_DELAY = 10000;
  private readonly evmChains = ['ethereum', 'bsc'];

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
  


  private async initializeWalletBalances(wallet: Wallet) {
    // Get ALL tokens for ALL networks
    const tokens = await this.tokenRepository
      .createQueryBuilder('token')
      .getMany();

    // Group tokens by baseSymbol
    const tokenGroups = tokens.reduce<Record<string, Token[]>>((groups, token) => {
      const baseSymbol = token.baseSymbol || token.symbol;
      if (!groups[baseSymbol]) {
        groups[baseSymbol] = [];
      }
      groups[baseSymbol].push(token);
      return groups;
    }, {});

    // Get or create unified balances
    for (const [baseSymbol, groupTokens] of Object.entries(tokenGroups)) {
      const types: ('spot' | 'funding')[] = ['spot', 'funding'];
      
      for (const type of types) {
        try {
          // Build complete networks metadata for all supported networks
          const networks = {};
          
          // Add metadata for all tokens with this baseSymbol
          for (const token of groupTokens) {
            // Get ALL wallets for this blockchain (both mainnet and testnet)
            const tokenWallets = await this.walletRepository.find({
              where: {
                userId: wallet.userId,
                blockchain: token.blockchain
              }
            });

            // Add entry for each network where we have a wallet
            for (const tokenWallet of tokenWallets) {
              const networkKey = `${token.blockchain}_${tokenWallet.network}`; // e.g. "ethereum_mainnet"
              networks[networkKey] = {
                walletId: tokenWallet.id,
                tokenId: token.id,
                networkVersion: token.networkVersion,
                contractAddress: token.contractAddress,
                network: tokenWallet.network
              };
            }
          }

          // Only create/update if we have network metadata
          if (Object.keys(networks).length > 0) {
            await this.walletBalanceRepository.upsert(
              {
                userId: wallet.userId,
                baseSymbol,
                type,
                balance: '0',
                metadata: { networks }
              },
              ['userId', 'baseSymbol', 'type']
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to initialize balance for ${baseSymbol}:`,
            error
          );
        }
      }
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
      where: { userId: wallet.userId }
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
        userId: wallet.userId,
        type,
      }
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
    const token = await this.tokenRepository.findOneBy({ id: tokenId });
    
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return this.walletBalanceRepository.findOne({
      where: {
        userId: wallet.userId,
        baseSymbol: token.baseSymbol || token.symbol,
        type,
      }
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
    const token = await this.tokenRepository.findOneBy({ id: tokenId });

    if (!token) {
      throw new NotFoundException('Token not found');
    }
    
    let balance = await this.walletBalanceRepository.findOne({
      where: {
        userId: wallet.userId,
        baseSymbol: token.baseSymbol || token.symbol,
        type,
      }
    });

    if (!balance) {
      balance = this.walletBalanceRepository.create({
        userId: wallet.userId,
        baseSymbol: token.baseSymbol || token.symbol,
        balance: '0',
        type,
        metadata: {
          networks: {
            [wallet.blockchain]: {
              walletId: wallet.id,
              tokenId: token.id,
              networkVersion: token.networkVersion,
              contractAddress: token.contractAddress,
              network: wallet.network
            }
          }
        }
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
    userId: any,
    type?: string, 
    pagination: PaginationParams = { page: 1, limit: 20 },
    showZeroBalances: boolean = true
  ): Promise<any> {
    try {
      this.logger.log('=== Starting getBalances ===');
      this.logger.log(`Type: ${type}, Page: ${pagination.page}, Limit: ${pagination.limit}`);

      // Extract ID if a user object was passed
      const actualUserId = typeof userId === 'object' ? userId.id : userId;

      const page = Math.max(1, Math.floor(Number(pagination.page)));
      const limit = Math.max(1, Math.floor(Number(pagination.limit)));
      
      const wallets = await this.walletRepository.find({
        where: { userId: actualUserId, status: 'active' }
      });

      // Add logging here
      this.logger.log(`Found ${wallets.length} active wallets:`);
      wallets.forEach(wallet => {
        this.logger.log(`Wallet: ${wallet.blockchain} - ${wallet.network} - ${wallet.id}`);
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
        .leftJoinAndSelect('balance.token', 'token')
        .where('balance.walletId IN (:...walletIds)', { walletIds });

      if (type) {
        query.andWhere('balance.type = :type', { type });
      }

      const balances = await query.getMany();

      // Process all balances (combines networks and sorts by value)
      const processedBalances = this.processBalancesWithNetworks(balances);

      // Filter zero balances if needed
      const displayBalances = showZeroBalances 
        ? processedBalances 
        : processedBalances.filter(b => !new Decimal(b.usdValue).isZero());

      // Calculate totals
      const spotBalances = displayBalances.filter(b => b.type === 'spot');
      const fundingBalances = displayBalances.filter(b => b.type === 'funding');
      
      const spotTotal = this.calculateTotal(spotBalances);
      const fundingTotal = this.calculateTotal(fundingBalances);

      // Paginate after all processing
      const startIndex = (pagination.page - 1) * pagination.limit;
      const paginatedBalances = displayBalances
        .slice(startIndex, startIndex + pagination.limit);

      // Calculate total USD value and 24h changes
      let totalChange24h = 0;
      let totalValue = 0;

      for (const balance of displayBalances) {
        const token = await this.tokenRepository.findOne({
          where: { symbol: balance.symbol }
        });

        if (token && balance.balance > 0) {
          const currentValue = balance.balance * token.currentPrice;
          totalValue += currentValue;
          
          // Calculate this token's contribution to the 24h change
          const tokenChange = currentValue * (token.changePercent24h / 100);
          totalChange24h += tokenChange;
        }
      }

      // Calculate overall change percentage
      const changePercent24h = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;

        return {
          balances: paginatedBalances,
        total: spotTotal + fundingTotal,
        spotTotal,
        fundingTotal,
        change24h: totalChange24h,
          changePercent24h,
          pagination: {
          total: displayBalances.length,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(displayBalances.length / pagination.limit),
          hasMore: pagination.page * pagination.limit < displayBalances.length
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get balances: ${error.message}`);
      throw error;
    }
  }

  private processBalancesWithNetworks(balances: any[]): any[] {
    const combinedBalances = new Map<string, any>();
    
    // First combine balances
    balances.forEach(balance => {
      const key = `${balance.token.baseSymbol}_${balance.type}`;
      const rawBalance = balance.balance || '0';
      const currentBalance = new Decimal(rawBalance);

      // Get price in proper decimal format
      const price = new Decimal(balance.token.currentPrice || '0');
      
      // Calculate USD value
      const usdValue = currentBalance.times(price);

      const networkBalance = {
        blockchain: balance.token.blockchain,
        networkVersion: balance.token.networkVersion,
        balance: rawBalance,
        type: balance.type,
        usdValue: usdValue.toString()  // Store USD value for sorting
      };

      if (combinedBalances.has(key)) {
        const existing = combinedBalances.get(key);
        const newBalance = new Decimal(existing.balance).plus(currentBalance);
        const newUsdValue = new Decimal(existing.usdValue).plus(usdValue);
        
        existing.balance = newBalance.toString();
        existing.usdValue = newUsdValue.toString();
        if (!existing.networks) existing.networks = [];
        existing.networks.push(networkBalance);
      } else {
        combinedBalances.set(key, {
          symbol: balance.token.symbol,
          baseSymbol: balance.token.baseSymbol,
          name: balance.token.name,
          decimals: balance.token.decimals,
          balance: currentBalance.toString(),
          usdValue: usdValue.toString(),
          type: balance.type,
          token: balance.token,
          networks: [networkBalance]
        });
      }
    });

    // Sort by USD value first, then alphabetically
    return Array.from(combinedBalances.values())
      .sort((a, b) => {
        const valueA = new Decimal(a.usdValue);
        const valueB = new Decimal(b.usdValue);
        
        // If both have value, sort by value (highest first)
        if (!valueA.isZero() && !valueB.isZero()) {
          return valueB.minus(valueA).toNumber();
        }
        
        // If only one has value, it comes first
        if (!valueA.isZero()) return -1;
        if (!valueB.isZero()) return 1;
        
        // If both are zero, sort alphabetically
        return a.symbol.localeCompare(b.symbol);
      });
  }

  private formatBalance(balance: string, decimals: number): string {
    try {
      // Just return the balance as is - it's already in the correct format
      return new Decimal(balance).toString();
    } catch (error) {
      this.logger.error(`Error formatting balance: ${error.message}`);
      return '0';
    }
  }

  private async fetchRemainingPrices(symbols: string[], balances: any[]) {
    try {
      const [newCurrentPrices, newPrices24h] = await Promise.all([
        this.exchangeService.getBatchPrices(symbols, { timestamp: 'current' }),
        this.exchangeService.getBatchPrices(symbols, { timestamp: '24h' })
      ]);

      // Update prices in cache
      // ... update cache with new prices ...
    } catch (error) {
      this.logger.error(`Failed to fetch remaining prices: ${error.message}`);
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

  private calculateTotal(balances: any[], priceField: string = 'currentPrice'): number {
    return balances.reduce((total, balance) => {
      const amount = new Decimal(balance.balance || '0');
      const price = new Decimal(balance.token[priceField] || '0');
      
      console.log('\nCalculating total for:', balance.symbol);
      console.log('Amount:', amount.toString());
      console.log('Price:', price.toString());
      console.log('Product:', amount.times(price).toString());
      
      return total + amount.times(price).toNumber();
    }, 0);
  }

  async getTokenMarketData(symbol: string, timeframe: string = '24H') {
    try {
      // Get market data
      const marketDataResponse = await axios.get(`${this.cryptoCompareApi}/pricemultifull`, {
        params: {
          fsyms: symbol,
          tsyms: 'USD',
          api_key: this.API_KEY
        }
      });

      const data = marketDataResponse.data.RAW[symbol].USD;

      // Add timeframe parameters
      const timeframeParams = {
        '1H': { limit: 60, endpoint: 'histominute' },
        '24H': { limit: 24, endpoint: 'histohour' },
        '1W': { limit: 7, endpoint: 'histoday' },
        '1M': { limit: 30, endpoint: 'histoday' },
        '1Y': { limit: 365, endpoint: 'histoday' },
        'ALL': { limit: 2000, endpoint: 'histoday' }
      };

      const params = timeframeParams[timeframe] || timeframeParams['24H'];
      
      // Get historical data with selected timeframe
      const historyResponse = await axios.get(`${this.cryptoCompareApi}/v2/${params.endpoint}`, {
        params: {
          fsym: symbol,
          tsym: 'USD',
          limit: params.limit,
          api_key: this.API_KEY
        }
      });

      // Helper to convert values to null if they're invalid
      const sanitizeNumber = (value: any) => {
        const num = Number(value);
        return (!isNaN(num) && num > 0) ? num : null;
      };
      
      return {
        marketCap: sanitizeNumber(data.MKTCAP),
        fullyDilutedMarketCap: sanitizeNumber(data.CIRCULATINGSUPPLYMKTCAP),
        volume24h: sanitizeNumber(data.VOLUME24HOUR),
        circulatingSupply: sanitizeNumber(data.CIRCULATINGSUPPLY),
        maxSupply: sanitizeNumber(data.SUPPLY),
        marketCapChange24h: sanitizeNumber(data.MKTCAP * data.CHANGEPCT24HOUR / 100),
        marketCapChangePercent24h: sanitizeNumber(data.CHANGEPCT24HOUR),
        volumeChangePercent24h: data.VOLUMEDAYTO > 0 ? 
          sanitizeNumber(((data.VOLUME24HOUR - data.VOLUMEDAYTO) / data.VOLUMEDAYTO) * 100) : null,
        priceHistory: historyResponse.data.Data.Data.map(d => [
          d.time * 1000,
          d.close
        ])
      };
    } catch (error) {
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateTokenMarketData() {
    try {
      const tokens = await this.tokenRepository.find({
        where: { symbol: Not(IsNull()) }
      });
      this.logger.log(`Found ${tokens.length} tokens to update`);

      const batches = chunk(tokens, this.BATCH_SIZE);
      this.logger.log(`Split into ${batches.length} batches of ${this.BATCH_SIZE}`);

      for (const [batchIndex, batch] of batches.entries()) {
        this.logger.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

        for (const token of batch) {
          try {
            this.logger.debug(`Updating ${token.symbol}...`);
            const marketData = await this.getTokenMarketData(token.symbol);
            
            if (marketData) {
              await this.tokenRepository.update(token.id, {
                marketCap: marketData.marketCap,
                fullyDilutedMarketCap: marketData.fullyDilutedMarketCap,
                volume24h: marketData.volume24h,
                circulatingSupply: marketData.circulatingSupply,
                maxSupply: marketData.maxSupply,
                marketCapChange24h: marketData.marketCapChange24h,
                marketCapChangePercent24h: marketData.marketCapChangePercent24h,
                volumeChangePercent24h: marketData.volumeChangePercent24h,
                priceHistory: marketData.priceHistory,
                lastPriceUpdate: new Date()
              });
              this.logger.debug(`Updated market data for ${token.symbol}`);
            }

            await delay(this.RATE_LIMIT_DELAY);

          } catch (error) {
            if (error.response?.status === 429) {
              this.logger.warn(`Rate limit hit for ${token.symbol}`);
              await delay(this.BATCH_DELAY);
              break;
            } else {
              this.logger.error(`Error updating ${token.symbol}:`, error);
            }
          }
        }

        if (batchIndex < batches.length - 1) {
          this.logger.log(`Waiting ${this.BATCH_DELAY/1000}s before next batch...`);
          await delay(this.BATCH_DELAY);
        }
      }

      this.logger.log('Finished updating all token market data');
    } catch (error) {
      this.logger.error('Error in updateTokenMarketData:', error);
    }
  }

  // Method to manually update a specific token
  async updateSingleTokenMarketData(tokenId: string, timeframe?: string) {
    try {
      const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
      if (!token) {
        throw new Error('Token not found');
      }

      if (!token.symbol) {
        throw new Error('No symbol found for token');
      }

      const marketData = await this.getTokenMarketData(token.symbol, timeframe);
      if (marketData) {
        await this.tokenRepository.update(token.id, {
          marketCap: marketData.marketCap,
          fullyDilutedMarketCap: marketData.fullyDilutedMarketCap,
          volume24h: marketData.volume24h,
          circulatingSupply: marketData.circulatingSupply,
          maxSupply: marketData.maxSupply,
          marketCapChange24h: marketData.marketCapChange24h,
          marketCapChangePercent24h: marketData.marketCapChangePercent24h,
          volumeChangePercent24h: marketData.volumeChangePercent24h,
          priceHistory: marketData.priceHistory,
          lastPriceUpdate: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error updating token ${tokenId}:`, error);
      throw error;
    }
  }

  async getDepositAddress(
    userId: string,
    tokenId: string,
    network: string,
    blockchain: string,
    version: string,
  ) {
    // First get the original token to get its baseSymbol
    const originalToken = await this.tokenRepository.findOne({
      where: { id: tokenId }
    });

    if (!originalToken) {
      throw new NotFoundException('Token not found');
    }

    // Find the token variant for the requested network
    const token = await this.tokenRepository.findOne({
      where: {
        baseSymbol: originalToken.baseSymbol,
        blockchain: blockchain.toLowerCase(),
        networkVersion: version.toUpperCase(),
        isActive: true
      }
    });

    if (!token) {
      throw new NotFoundException(
        `Network ${blockchain}/${version} not available for this token`
      );
    }

    // Find the user's wallet for this blockchain and network
    const wallet = await this.walletRepository.findOne({
      where: {
        userId,
        blockchain: blockchain.toLowerCase(),
        network: network.toLowerCase(),
      },
    });

    if (!wallet) {
      throw new NotFoundException(
        `No wallet found for ${blockchain} ${network}`
      );
    }

    return {
      address: wallet.address,
      network: wallet.network,
      networkVersion: token.networkVersion,
      memo: wallet.memo,
      tag: wallet.tag,
    };
  }

  async getAvailableTokens() {
    const tokens = await this.tokenRepository.find({
      where: { isActive: true },
      order: { symbol: 'ASC' }
    });

    // Group tokens by baseSymbol
    const groupedTokens = tokens.reduce((acc, token) => {
      const key = token.baseSymbol || token.symbol;
      if (!acc[key]) {
        acc[key] = {
          id: token.id,
          symbol: token.symbol,
          name: token.name.split(' (')[0],
          baseSymbol: token.baseSymbol,
          metadata: token.metadata,
          currentPrice: token.currentPrice,
          networks: []
        };
      }

      // For NATIVE tokens, add both mainnet and testnet variants
      if (token.networkVersion === 'NATIVE') {
        // Always add mainnet
        acc[key].networks.push({
          blockchain: token.blockchain,
          version: token.networkVersion,
          network: 'mainnet',
          arrivalTime: token.blockchain === 'ethereum' ? '10-30 minutes' : '5-10 minutes',
          requiredFields: {
            memo: false,
            tag: false
          }
        });

        // Add testnet if supported in metadata
        if (token.metadata?.networks?.includes('testnet')) {
          acc[key].networks.push({
            blockchain: token.blockchain,
            version: token.networkVersion,
            network: 'testnet',
            arrivalTime: token.blockchain === 'ethereum' ? '10-30 minutes' : '5-10 minutes',
            requiredFields: {
              memo: false,
              tag: false
            }
          });
        }
      } else {
        // For non-NATIVE tokens (TRC20, BEP20, etc.), just add mainnet
        acc[key].networks.push({
          blockchain: token.blockchain,
          version: token.networkVersion,
          network: 'mainnet',
          arrivalTime: token.blockchain === 'ethereum' ? '10-30 minutes' : '5-10 minutes',
          requiredFields: {
            memo: false,
            tag: false
          }
        });
      }

      return acc;
    }, {});

    return {
      tokens: Object.values(groupedTokens)
    };
  }

  async findEvmWallet(userId: string, network: string): Promise<Wallet | null> {
    return this.walletRepository.findOne({
      where: [
        { userId, blockchain: 'ethereum', network },
        { userId, blockchain: 'bsc', network }
      ],
      order: {
        createdAt: 'ASC'
      }
    });
  }

  async createWithExistingAddress(
    userId: string,
    createWalletDto: CreateWalletDto,
    existingAddress: string,
    existingKeyId: string
  ): Promise<Wallet> {
    const wallet = new Wallet();
    wallet.userId = userId;
    wallet.blockchain = createWalletDto.blockchain;
    wallet.network = createWalletDto.network;
    wallet.address = existingAddress;
    wallet.keyId = existingKeyId;
    
    return this.walletRepository.save(wallet);
  }

  private async createEvmWallet(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    this.logger.debug('Creating EVM wallet');

    // Use a transaction for the entire process to ensure atomicity
    return this.walletRepository.manager.transaction(async manager => {
      // First check if this exact wallet exists
      const existingWallet = await manager.findOne(Wallet, {
        where: {
          userId,
          blockchain: createWalletDto.blockchain,
          network: createWalletDto.network
        }
      });

      if (existingWallet) {
        return existingWallet;
      }

      // Then look for ANY existing EVM wallet for this network
      const existingEvmWallet = await manager
        .createQueryBuilder(Wallet, 'wallet')
        .where('wallet.userId = :userId', { userId })
        .andWhere('wallet.blockchain IN (:...blockchains)', { 
          blockchains: this.evmChains 
        })
        .andWhere('wallet.network = :network', { 
          network: createWalletDto.network 
        })
        .orderBy('wallet.createdAt', 'ASC')
        .getOne();

      if (existingEvmWallet) {
        // Create new wallet entry with same address
        const wallet = manager.create(Wallet, {
          userId,
          blockchain: createWalletDto.blockchain,
          network: createWalletDto.network,
          address: existingEvmWallet.address,
          keyId: existingEvmWallet.keyId
        });

        const savedWallet = await manager.save(Wallet, wallet);
        await this.initializeWalletBalances(savedWallet);
        return savedWallet;
      }

      // No existing EVM wallet, create new one
      const { address, keyId } = await this.keyManagementService.generateWallet(
        userId,
        'ethereum', // Always use ethereum for first EVM wallet
        createWalletDto.network
      );

      const wallet = manager.create(Wallet, {
        userId,
        blockchain: createWalletDto.blockchain,
        network: createWalletDto.network,
        address,
        keyId
      });

      const savedWallet = await manager.save(Wallet, wallet);
      await this.initializeWalletBalances(savedWallet);
      return savedWallet;
    });
  }

  async create(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    this.logger.debug(`Creating wallet for user ${userId}: ${createWalletDto.blockchain} ${createWalletDto.network}`);

    // For EVM chains
    if (this.evmChains.includes(createWalletDto.blockchain)) {
      return this.createEvmWallet(userId, createWalletDto);
    }

    // Non-EVM wallet creation
    return this.createNonEvmWallet(userId, createWalletDto);
  }

  private async createNonEvmWallet(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    try {
      const { address, keyId } = await this.keyManagementService.generateWallet(
        userId,
        createWalletDto.blockchain,
        createWalletDto.network
      );
      
      const wallet = new Wallet();
      wallet.userId = userId;
      wallet.blockchain = createWalletDto.blockchain;
      wallet.network = createWalletDto.network;
      wallet.address = address;
      wallet.keyId = keyId;
      
      const savedWallet = await this.walletRepository.save(wallet);
      await this.initializeWalletBalances(savedWallet);
      return savedWallet;
    } catch (error) {
      this.logger.error(`Failed to create wallet: ${error.message}`, error.stack);
      throw new Error('Failed to create wallet');
    }
  }

  private async createWalletsSequentially(userId: string, walletConfigs: CreateWalletDto[]): Promise<{
    successful: number;
    failed: number;
    total: number;
  }> {
    let successful = 0;
    let failed = 0;
    const total = walletConfigs.length;

    // Process EVM wallets first to ensure consistent address
    const evmConfigs = walletConfigs.filter(config => this.evmChains.includes(config.blockchain));
    const nonEvmConfigs = walletConfigs.filter(config => !this.evmChains.includes(config.blockchain));
    
    // Sort by network to ensure consistent order and prevent deadlocks
    const sortedConfigs = [...evmConfigs.sort((a, b) => a.network.localeCompare(b.network)), ...nonEvmConfigs];

    for (const config of sortedConfigs) {
      try {
        await this.create(userId, config);
        successful++;
      } catch (error) {
        this.logger.error(`Failed to create wallet: ${error.message}`, error.stack);
        failed++;
      }
    }

    return { successful, failed, total };
  }

  async createWalletsForUser(userId: string): Promise<{
    successful: number;
    failed: number;
    total: number;
  }> {
    const walletConfigs = [
      { blockchain: 'bitcoin', network: 'mainnet' },
      { blockchain: 'bitcoin', network: 'testnet' },
      { blockchain: 'ethereum', network: 'mainnet' },
      { blockchain: 'ethereum', network: 'testnet' },
      { blockchain: 'bsc', network: 'mainnet' },
      { blockchain: 'bsc', network: 'testnet' },
      { blockchain: 'xrp', network: 'mainnet' },
      { blockchain: 'xrp', network: 'testnet' },
      { blockchain: 'trx', network: 'mainnet' },
      { blockchain: 'trx', network: 'testnet' },
    ];

    return this.createWalletsSequentially(userId, walletConfigs);
  }
} 