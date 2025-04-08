import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, Raw, In, MoreThanOrEqual, DataSource, SelectQueryBuilder } from 'typeorm';
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
import { NetworkConfig, NetworkResponse } from './types/network.types';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { Withdrawal } from './entities/withdrawal.entity';
import { Connection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { AddressBook } from './entities/address-book.entity';
import { CreateAddressBookDto } from './dto/create-address-book.dto';
import { EmailService } from '../email/email.service';
import { Transfer } from './entities/transfer.entity';
import { TransferDto } from './dto/transfer.dto';
import { Conversion } from './entities/conversion.entity';
import { Deposit } from './entities/deposit.entity';

interface PaginationParams {
  page: number;
  limit: number;
}

interface NetworkBalance {
  blockchain: string;
  network: string;
  walletId: string;
  tokenId: string;
  networkVersion: string;
  contractAddress?: string;
  balance: string;
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: string;
  price24h: string;
  changePercent24h: number;
  blockchain: string;
  contractAddress?: string;
  networkVersion: string;
  [key: string]: any;
}

interface ProcessedBalance {
  id: string;
  userId: string;
  baseSymbol: string;
  type: 'spot' | 'funding';
  balance: string;
  usdValue: string;
  networks: NetworkBalance[];
  token: TokenData | null;
  metadata: {
    networks: {
      [key: string]: {
        walletId: string;
        tokenId: string;
        networkVersion: string;
        contractAddress?: string;
        network: string;
      };
    };
  };
  frozen: string;
}

interface BalanceResponse {
  balances: ProcessedBalance[];
  total: string;
  change24h: string;
  changePercent24h: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private kycLevelRepository: Repository<KYCLevel>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    private keyManagementService: KeyManagementService,
    private readonly exchangeService: ExchangeService,
    private connection: Connection,
    @InjectRepository(AddressBook)
    private addressBookRepository: Repository<AddressBook>,
    private readonly emailService: EmailService,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    private readonly dataSource: DataSource,
    @InjectRepository(Conversion)
    private conversionRepository: Repository<Conversion>,
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
    console.log('Fetching wallet for user ID:', userId, 'and wallet ID:', walletId);
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

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
    userId: string,
    type?: 'spot' | 'funding',
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<BalanceResponse> {
    try {
      const page = Math.max(1, Math.floor(Number(pagination.page)));
      const limit = Math.max(1, Math.floor(Number(pagination.limit)));
      const offset = (page - 1) * limit;

      // Single query with proper ordering and pagination
      const balances = await this.walletBalanceRepository
        .createQueryBuilder('balance')
        .where('balance.userId = :userId', { userId })
        .andWhere(type ? 'balance.type = :type' : '1=1', { type })
        // Order by non-zero balances first, then by baseSymbol
        .orderBy('CAST(balance.balance AS DECIMAL) > 0', 'DESC')
        .addOrderBy('balance.baseSymbol', 'ASC')
        .skip(offset)
        .take(limit)
        .getMany();

      // Calculate total count for pagination
      const totalCount = await this.walletBalanceRepository.count({
        where: { userId, ...(type && { type }) }
      });

      // First fetch all token prices in batch to avoid multiple DB queries
      const tokenIds = new Set<string>();
      balances.forEach(balance => {
        if (balance.metadata?.networks) {
          Object.values(balance.metadata.networks).forEach(networkData => {
            tokenIds.add(networkData.tokenId);
          });
        }
      });

      // Fetch all tokens in one query
      const tokens = await this.tokenRepository.find({
        where: { id: In([...tokenIds]) }
      });

      // Create a map for quick token lookup
      const tokenMap = new Map(tokens.map(token => [token.id, token]));

      const processedBalances = await Promise.all(
        balances.map(async (balance) => {
          const networks = [];
          let totalBalance = new Decimal(balance.balance || '0');

          if (balance.metadata?.networks) {
            for (const [networkKey, networkData] of Object.entries(balance.metadata.networks)) {
              const [blockchain, network] = networkKey.split('_');
              
              const token = tokenMap.get(networkData.tokenId);

              if (token) {
                networks.push({
                  blockchain,
                  network,
                  walletId: networkData.walletId,
                  tokenId: networkData.tokenId,
                  networkVersion: networkData.networkVersion,
                  contractAddress: networkData.contractAddress,
                  balance: balance.balance
                });
              }
            }
          }

          // Get token data from our pre-fetched map
          const firstNetwork = Object.values(balance.metadata?.networks || {})[0];
          const token = firstNetwork ? tokenMap.get(firstNetwork.tokenId) : null;

          // Ensure we have valid price data
          const currentPrice = token?.currentPrice ? new Decimal(token.currentPrice) : new Decimal(0);
          const usdValue = totalBalance.times(currentPrice).toString();

          // Log price data for debugging
          // this.logger.debug(`Token ${token?.symbol}: Price = ${currentPrice}, Balance = ${totalBalance}, USD Value = ${usdValue}`);

          // this.logger.debug(`Balance details for ${balance.baseSymbol}:`, {
          //   balance: totalBalance.toString(),
          //   frozen: balance.frozen,
          // });

          return {
            ...balance,
            networks,
            balance: totalBalance.toString(),
            frozen: balance.frozen || '0',
            usdValue,
            token: token ? {
              ...token,
              currentPrice: token.currentPrice?.toString() || '0',
              price24h: token.price24h?.toString() || '0',
              changePercent24h: token.changePercent24h || 0
            } : null
          };
        })
      );

      // Calculate totals using Decimal.js
      const totalValue = processedBalances.reduce((acc: Decimal, balance) => {
        return acc.plus(new Decimal(balance.usdValue || '0'));
      }, new Decimal(0));

      const totalChange24h = processedBalances.reduce((acc: Decimal, balance) => {
        if (!balance.token) return acc;
        
        const price24h = new Decimal(balance.token.price24h || '0');
        const currentPrice = new Decimal(balance.token.currentPrice || '0');
        const balanceAmount = new Decimal(balance.balance || '0');
        
        return acc.plus(
          currentPrice.minus(price24h).times(balanceAmount)
        );
      }, new Decimal(0));

      const changePercent24h = totalValue.isZero()
        ? 0
        : totalChange24h.div(totalValue).times(100).toNumber();

        return {
        balances: processedBalances,
        total: totalValue.toString(),
        change24h: totalChange24h.toString(),
          changePercent24h,
          pagination: {
          total: totalCount,
          page,
          limit,
          hasMore: offset + limit < totalCount
        }
      };
    } catch (error) {
      this.logger.error('Error in getBalances:', error);
      throw error;
    }
  }

  private processBalancesWithNetworks(
    balances: ProcessedBalance[]
  ): ProcessedBalance[] {
    const combinedBalances = new Map<string, ProcessedBalance>();
    
    balances.forEach(balance => {
      if (!balance.token) return;

      const key = `${balance.token.baseSymbol}_${balance.type}`;
      const currentBalance = new Decimal(balance.balance || '0');
      const price = new Decimal(balance.token.currentPrice || '0');
      const usdValue = currentBalance.times(price);

      const networkBalance: NetworkBalance = {
        blockchain: balance.token.blockchain,
        network: balance.metadata.networks[Object.keys(balance.metadata.networks)[0]].network,
        walletId: balance.metadata.networks[Object.keys(balance.metadata.networks)[0]].walletId,
        tokenId: balance.token.id,
        networkVersion: balance.token.networkVersion,
        contractAddress: balance.token.contractAddress,
        balance: balance.balance
      };

      if (combinedBalances.has(key)) {
        const existing = combinedBalances.get(key)!;
        existing.balance = new Decimal(existing.balance)
          .plus(currentBalance).toString();
        existing.usdValue = new Decimal(existing.usdValue)
          .plus(usdValue).toString();
        existing.networks.push(networkBalance);
      } else {
        combinedBalances.set(key, {
          ...balance,
          usdValue: usdValue.toString(),
          networks: [networkBalance]
        });
      }
    });

    return Array.from(combinedBalances.values());
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

  async getTotalBalance(
    userId: string, 
    currency: string, 
    type?: 'spot' | 'funding'
  ): Promise<number> {
    try {
      const data = await this.getBalances(userId, type);
      
      if (data.total !== undefined) {
        if (currency.toUpperCase() === 'USD') {
          return Number(data.total);
        }
        const exchangeRate = await this.exchangeService.getRateForCurrency(currency);
        return Number(data.total) * exchangeRate.rate;
      }

      const balances = Array.isArray(data) ? data : data.balances;
      const exchangeRate = currency.toUpperCase() === 'USD' 
        ? { rate: 1 } 
        : await this.exchangeService.getRateForCurrency(currency);

      const tokenPrices = await this.getTokenPrices(balances.map(b => b.token));

      // Properly type the reduce function
      const total = (balances as any[]).reduce<Decimal>((acc: Decimal, balance: ProcessedBalance) => {
        if (!balance.token) return acc;
        
        const balanceAmount = new Decimal(balance.balance || '0');
        const tokenPrice = new Decimal(tokenPrices[balance.token.symbol] || '0');
        const usdValue = balanceAmount.times(tokenPrice);
        const exchangeValue = usdValue.times(new Decimal(exchangeRate.rate));
        
        return acc.plus(exchangeValue);
      }, new Decimal(0));

      return total.toNumber();
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

  @Cron(CronExpression.EVERY_HOUR)
  async updateTokenMarketData() {
    try {
      const tokens = await this.tokenRepository.find({
        where: { symbol: Not(IsNull()) }
      });
      this.logger.log(`Found ${tokens.length} tokens to update`);

      for (const token of tokens) {
        try {
            const marketData = await this.getTokenMarketData(token.symbol);
            
          if (marketData && marketData.priceHistory?.length > 0) {
            // Get current price from latest price history entry
            const currentPrice = marketData.priceHistory[marketData.priceHistory.length - 1][1];
            
              await this.tokenRepository.update(token.id, {
              currentPrice: currentPrice.toString(),
              price24h: marketData.priceHistory[0][1].toString(), // First entry is 24h ago
              changePercent24h: marketData.marketCapChangePercent24h,
                lastPriceUpdate: new Date()
              });

            this.logger.debug(`Updated price for ${token.symbol}: ${currentPrice}`);
          }
          } catch (error) {
              this.logger.error(`Error updating ${token.symbol}:`, error);
            }
          }
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

    // First group tokens by baseSymbol
    const tokenGroups = tokens.reduce<Record<string, Token[]>>((groups, token) => {
      const key = token.baseSymbol || token.symbol;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(token);
      return groups;
    }, {});

    // Then create unified token representations
    const unifiedTokens = Object.entries(tokenGroups).map(([baseSymbol, tokens]) => {
      // Use the first token for basic info
      const primaryToken = tokens[0];
      
      // Collect all networks across all token variants
      const networks = tokens.reduce((allNetworks, token) => {
        if (token.networkConfigs) {
          Object.entries(token.networkConfigs).forEach(([version, networksByType]) => {
            Object.entries(networksByType).forEach(([networkType, config]) => {
              if (config.isActive) {
                const networkKey = `${config.blockchain}_${config.network}_${config.version}`;
                if (!allNetworks.has(networkKey)) {
                  allNetworks.set(networkKey, {
                    blockchain: config.blockchain,
                    version: config.version,
                    network: config.network,
                    arrivalTime: config.arrivalTime,
                    requiredFields: config.requiredFields
                  } as NetworkResponse);
                }
              }
            });
          });
        }
        return allNetworks;
      }, new Map<string, NetworkResponse>());

    return {
        id: primaryToken.id,
        symbol: primaryToken.symbol,
        name: primaryToken.name.split(' (')[0],
        baseSymbol: primaryToken.baseSymbol,
        metadata: primaryToken.metadata,
        currentPrice: primaryToken.currentPrice,
        networks: Array.from(networks.values())
      };
    });

    return { tokens: unifiedTokens };
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

  async calculateTotal(
    userId: string,
    type?: 'spot' | 'funding'
  ): Promise<string> {
    const data = await this.getBalances(userId, type);
    return data.total;
  }

  async calculateTotalInCurrency(
    userId: string,
    type: 'spot' | 'funding' | undefined,
    currency: string
  ): Promise<string> {
    const data = await this.getBalances(userId, type);
    const exchangeRate = await this.exchangeService.getRates(currency);
    
    return new Decimal(data.total)
      .times(new Decimal(exchangeRate.rate))
      .toString();
  }

  private logToFile(message: string) {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    
    const logFile = path.join(logDir, 'withdrawal-fee.log');
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} ${message}\n`;
    
    fs.appendFileSync(logFile, logMessage);
  }

  async calculateWithdrawalFee(
    tokenId: string,
    amount: number,
    networkVersion: string,
    network: string,
    userId: string,
  ): Promise<{
    feeAmount: string;
    feeUSD: string;
    receiveAmount: string;
  }> {
    this.logToFile(`[FEE] Calculating withdrawal fee - Input params:
      tokenId: ${tokenId}
      amount: ${amount}
      networkVersion: ${networkVersion}
      network: ${network}`);

    const token = await this.tokenRepository.findOne({
      where: { id: tokenId }
    });
    
    if (!token) {
      this.logToFile(`[ERROR] Token not found with id: ${tokenId}`);
      throw new NotFoundException('Token not found');
    }

    // If requesting testnet but have mainnet token, find the corresponding testnet token
    if (network === 'testnet' && !token.networkConfigs?.[networkVersion]?.[network]) {
      this.logToFile(`[INFO] Looking for testnet token for ${token.symbol}`);
      
      try {
        // Fixed query with proper column name quoting
        const testnetToken = await this.tokenRepository
          .createQueryBuilder('tokens')
          .where('"tokens"."baseSymbol" = :baseSymbol', { baseSymbol: token.baseSymbol })
          .andWhere('"tokens"."networkVersion" = :networkVersion', { networkVersion })
          .andWhere(`"tokens"."networkConfigs"::jsonb -> :version -> 'testnet' IS NOT NULL`, 
            { version: networkVersion })
          .getOne();

        if (testnetToken) {
          this.logToFile(`[INFO] Found testnet token: ${testnetToken.id}`);
          return this.calculateWithdrawalFee(testnetToken.id, amount, networkVersion, network, userId);
        } else {
          this.logToFile(`[ERROR] No testnet token found for ${token.symbol} with version ${networkVersion}`);
          throw new BadRequestException(`No testnet configuration available for ${token.symbol}`);
        }
      } catch (error) {
        this.logToFile(`[ERROR] Error finding testnet token: ${error.message}`);
        throw new BadRequestException('Error finding network configuration');
      }
    }

    this.logToFile(`[TOKEN] Found:
      id: ${token.id}
      symbol: ${token.symbol}
      networkVersion: ${token.networkVersion}
      networkConfigs: ${JSON.stringify(token.networkConfigs, null, 2)}`);

    const networkConfig = token.networkConfigs?.[networkVersion]?.[network];
    
    this.logToFile(`[CONFIG] Network configuration:
      Looking for: ${networkVersion}/${network}
      Found config: ${JSON.stringify(networkConfig, null, 2)}
      Available versions: ${Object.keys(token.networkConfigs || {}).join(', ')}
      Available networks for ${networkVersion}: ${
        Object.keys(token.networkConfigs?.[networkVersion] || {}).join(', ')
      }`);

    if (!networkConfig) {
      this.logToFile(`[ERROR] Invalid network configuration for ${token.symbol}:
        Requested: ${networkVersion}/${network}
        Available configs: ${JSON.stringify(token.networkConfigs, null, 2)}`);
      throw new BadRequestException('Invalid network configuration');
    }

    const fee = networkConfig.fee;
    if (!fee) {
      throw new BadRequestException('Fee configuration not found');
    }

    let feeAmount = '0';
    
    switch (fee.type) {
      case 'usd':
        const usdFee = new Decimal(fee.value);
        const tokenPrice = new Decimal(token.currentPrice || '0');
        feeAmount = tokenPrice.isZero() 
          ? '0' 
          : usdFee.div(tokenPrice).toString();
        break;
        
      case 'percentage':
        feeAmount = new Decimal(amount)
          .times(new Decimal(fee.value))
          .toString();
        break;
        
      case 'token':
        feeAmount = fee.value;
        break;
        
      default:
        throw new BadRequestException('Invalid fee configuration');
    }

    const feeUSD = new Decimal(feeAmount)
      .times(new Decimal(token.currentPrice || '0'))
      .toString();

    // Check minimum withdrawal
    if (new Decimal(amount).lessThan(networkConfig.minWithdrawal)) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ${networkConfig.minWithdrawal} ${token.symbol}`
      );
    }

    // Calculate fee
    const receiveAmount = new Decimal(amount).minus(new Decimal(feeAmount));
    
    // Check if receive amount would be negative or zero
    if (receiveAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        `Withdrawal amount must be greater than fee (${feeAmount} ${token.symbol})`
      );
    }

    this.logToFile(`[RESULT] Fee calculation results:
      Fee Amount: ${feeAmount} ${token.symbol}
      Fee USD: $${feeUSD}
      Receive Amount: ${receiveAmount} ${token.symbol}`);

    // Get user's KYC level first
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['kycLevel']
    });

    const kycLevel = await this.kycLevelRepository.findOne({
      where: { level: user.kycLevel }
    });

    if (!kycLevel) {
      throw new BadRequestException('KYC level not found');
    }

    // Calculate this withdrawal's USD value
    const withdrawalUsdValue = new Decimal(amount)
      .times(new Decimal(token.currentPrice || '0'))
      .toString();

    // Check withdrawal limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const withdrawals = await this.withdrawalRepository.find({
      where: {
        userId,
        status: In(['completed', 'pending']),
        createdAt: MoreThanOrEqual(firstDayOfMonth)
      }
    });

    let dailyTotal = new Decimal(0);
    let monthlyTotal = new Decimal(0);

    for (const withdrawal of withdrawals) {
      const usdValue = withdrawal.metadata?.amount?.usdValue || '0';
      monthlyTotal = monthlyTotal.plus(usdValue);
      
      if (withdrawal.createdAt >= today) {
        dailyTotal = dailyTotal.plus(usdValue);
      }
    }

    const newDailyTotal = dailyTotal.plus(withdrawalUsdValue);
    const newMonthlyTotal = monthlyTotal.plus(withdrawalUsdValue);

    const limits = kycLevel.limits.withdrawal;
    if (newDailyTotal.greaterThan(limits.daily)) {
      throw new BadRequestException(`Daily withdrawal limit of $${limits.daily} exceeded`);
    }
    if (newMonthlyTotal.greaterThan(limits.monthly)) {
      throw new BadRequestException(`Monthly withdrawal limit of $${limits.monthly} exceeded`);
    }

    return {
      feeAmount,
      feeUSD,
      receiveAmount: receiveAmount.toString(),
    };
  }

  async validateWithdrawalRequest(
    userId: string,
    tokenId: string,
    amount: string,
    networkVersion: string,
    network: string,
  ): Promise<{
    token: Token;
    balance: WalletBalance;
    fee: {
      feeAmount: string;
      feeUSD: string;
      receiveAmount: string;
    };
  }> {
    // Get token
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Get balance
    const balance = await this.walletBalanceRepository.findOne({
      where: {
        userId,
        type: 'funding',
        baseSymbol: token.baseSymbol,
      }
    });

    if (!balance) {
      throw new NotFoundException('Balance not found');
    }

    const fee = await this.calculateWithdrawalFee(
      tokenId,
      new Decimal(amount).toNumber(),
      networkVersion,
      network,
      userId,
    );

    const totalRequired = new Decimal(amount).plus(new Decimal(fee.feeAmount));
    const currentBalance = new Decimal(balance.balance);

    if (currentBalance.lessThan(totalRequired)) {
      throw new BadRequestException('Insufficient balance for withdrawal and fees');
    }

    return { token, balance, fee };
  }

  async createWithdrawal(
    userId: string,
    withdrawalDto: CreateWithdrawalDto,
  ): Promise<Withdrawal> {
    // First validate the request and calculate fees
    const { token, balance, fee } = await this.validateWithdrawalRequest(
      userId,
      withdrawalDto.tokenId,
      withdrawalDto.amount.toString(),
      withdrawalDto.networkVersion,
      withdrawalDto.network,
    );

    // Calculate USD value of withdrawal amount
    const usdValue = new Decimal(withdrawalDto.amount)
      .times(new Decimal(token.currentPrice || '0'))
      .toString();

    // Create withdrawal record
    const withdrawal = new Withdrawal();
    withdrawal.userId = userId;
    withdrawal.tokenId = withdrawalDto.tokenId;
    withdrawal.address = withdrawalDto.address;
    withdrawal.amount = withdrawalDto.amount.toString();
    withdrawal.fee = fee.feeAmount;
    withdrawal.networkVersion = withdrawalDto.networkVersion;
    withdrawal.network = withdrawalDto.network;
    withdrawal.memo = withdrawalDto.memo;
    withdrawal.tag = withdrawalDto.tag;
    withdrawal.status = 'pending';
    withdrawal.metadata = {
      token: {
        symbol: token.symbol,
        name: token.name,
        networkVersion: withdrawalDto.networkVersion,
      },
      amount: {  // Add amount metadata
        value: withdrawalDto.amount.toString(),
        usdValue: usdValue,
      },
      fee: {
        amount: fee.feeAmount,
        usdValue: fee.feeUSD,
      },
      receiveAmount: fee.receiveAmount,
    };

    // Start transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct from balance
      const totalDeduction = new Decimal(withdrawalDto.amount)
        .plus(new Decimal(fee.feeAmount))
        .toString();
        
      await queryRunner.manager.update(
        WalletBalance,
        { id: balance.id },
        { 
          balance: new Decimal(balance.balance)
            .minus(new Decimal(totalDeduction))
            .toString() 
        }
      );

      // Save withdrawal
      const savedWithdrawal = await queryRunner.manager.save(withdrawal);
      
      // Send email notification
      const user = await this.userRepository.findOne({ where: { id: userId } });
      await this.emailService.sendWithdrawalNotificationEmail(
        user.email,
        user.fullName || 'User',
        savedWithdrawal
      );

      await queryRunner.commitTransaction();
      return savedWithdrawal;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createAddressBookEntry(
    userId: string,
    createAddressBookDto: CreateAddressBookDto,
  ): Promise<AddressBook> {
    const entry = this.addressBookRepository.create({
      userId,
      ...createAddressBookDto,
    });
    return this.addressBookRepository.save(entry);
  }

  async getAddressBook(userId: string): Promise<AddressBook[]> {
    console.log('Fetching address book for user ID:', userId);
    return this.addressBookRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async checkAddressExists(
    userId: string, 
    address: string,
    blockchain: string,
    network: string,
  ): Promise<boolean> {
    console.log('Checking address existence:', {
      userId,
      address,
      blockchain,
      network
    });

    const entry = await this.addressBookRepository.findOne({
      where: { 
        userId, 
        address, 
        blockchain,
        network,
        isActive: true 
      },
    });

    console.log('Found entry:', entry);
    return !!entry;
  }

  async transferBalance(
    userId: string,
    transferDto: TransferDto,
  ): Promise<Transfer> {
    const { tokenId, amount, fromType, toType } = transferDto;

    // Get the token to find its baseSymbol
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const baseSymbol = token.baseSymbol || token.symbol;

    // Start transaction
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check if user has sufficient balance
      const fromBalance = await this.getBalance(userId, baseSymbol, fromType);
      if (parseFloat(fromBalance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // 2. Update balances
      await manager.query(
        `UPDATE wallet_balances 
         SET balance = balance - $1 
         WHERE "userId" = $2 AND "baseSymbol" = $3 AND type = $4`,
        [amount, userId, baseSymbol, fromType],
      );

      await manager.query(
        `UPDATE wallet_balances 
         SET balance = balance + $1 
         WHERE "userId" = $2 AND "baseSymbol" = $3 AND type = $4`,
        [amount, userId, baseSymbol, toType],
      );

      // 3. Create transfer record
      const transfer = manager.create(Transfer, {
        userId,
        tokenId,
        amount: amount.toString(),
        fromType,
        toType,
        status: 'completed',
        metadata: {
          timestamp: new Date(),
        },
      });

      const savedTransfer = await manager.save(transfer);

      // 4. Send email notification
      const user = await this.userRepository.findOne({ where: { id: userId } });

      await this.emailService.sendTransferConfirmation(
        user.email,
        {
          amount: amount.toString(),
          token: token.symbol,
          fromType,
          toType,
          date: new Date(),
        },
      );

      return savedTransfer;
    });
  }

  async getTransferHistory(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ transfers: Transfer[]; total: number }> {
    const [transfers, total] = await this.transferRepository.findAndCount({
      where: { userId },
      relations: ['token'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transfers, total };
  }

  async getBalance(userId: string, baseSymbol: string, type: 'spot' | 'funding'): Promise<string> {
    const balance = await this.walletBalanceRepository.findOne({
      where: {
        userId,
        baseSymbol,
        type,
      },
    });

    if (!balance) {
      return '0';
    }

    return balance.balance;
  }

  async getExchangeRate(
    fromTokenId: string,
    toTokenId: string,
  ): Promise<number> {
    try {
      this.logger.debug(`Getting exchange rate for tokens: ${fromTokenId} -> ${toTokenId}`);

      // Get both tokens
      const [fromToken, toToken] = await Promise.all([
        this.tokenRepository.findOne({ where: { id: fromTokenId } }),
        this.tokenRepository.findOne({ where: { id: toTokenId } })
      ]);

      this.logger.debug('Token prices:');
      this.logger.debug(`From Token (${fromToken?.symbol}): ${fromToken?.currentPrice}`);
      this.logger.debug(`To Token (${toToken?.symbol}): ${toToken?.currentPrice}`);

      if (!fromToken || !toToken) {
        throw new NotFoundException('One or both tokens not found');
      }

      // Calculate exchange rate using current prices
      if (!fromToken.currentPrice || !toToken.currentPrice) {
        throw new BadRequestException('Price data not available');
      }

      const fromPrice = new Decimal(fromToken.currentPrice);
      const toPrice = new Decimal(toToken.currentPrice);

      this.logger.debug(`From Price (Decimal): ${fromPrice}`);
      this.logger.debug(`To Price (Decimal): ${toPrice}`);

      if (fromPrice.isZero()) {
        throw new BadRequestException('Invalid exchange rate - from price is zero');
      }

      // Calculate the exchange rate (reversed from previous calculation)
      // For example: if BTC = $89393.52 and USDT = $1.001
      // Then 1 BTC = 89393.52/1.001 USDT ≈ 89304.21 USDT
      const exchangeRate = fromPrice.dividedBy(toPrice);
      this.logger.debug(`Calculated exchange rate: ${exchangeRate}`);

      return exchangeRate.toNumber();
    } catch (error) {
      this.logger.error(`Error calculating exchange rate: ${error.message}`);
      throw error;
    }
  }

  // Helper method to validate UUID
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  async getConversionFee(tokenId: string, amount: number): Promise<{ type: string; value: string }> {
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Access conversion fee the same way we access regular fee
    const networkConfig = token.networkConfigs[token.networkVersion][token.metadata.networks[0]];
    return networkConfig.conversionFee;
  }

  async convertToken(userId: string, data: {
    fromTokenId: string;
    toTokenId: string;
    amount: number;
  }): Promise<Conversion> {
    const { fromTokenId, toTokenId, amount } = data;
    
    // Get token first to get baseSymbol
    const fromToken = await this.tokenRepository.findOne({ where: { id: fromTokenId } });
    if (!fromToken) {
      throw new NotFoundException('Source token not found');
    }

    // Check balance using baseSymbol
    const currentBalance = await this.getBalance(userId, fromToken.baseSymbol || fromToken.symbol, 'funding');
    if (parseFloat(currentBalance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Get exchange rate and fee
    const exchangeRate = await this.getExchangeRate(fromTokenId, toTokenId);
    const conversionFee = await this.getConversionFee(fromTokenId, amount);
    
    // Calculate fee amount in source token
    let feeAmount = 0;
    
    switch (conversionFee.type) {
      case 'percentage':
        feeAmount = (amount * parseFloat(conversionFee.value)) / 100;
        break;
      case 'token':
        feeAmount = parseFloat(conversionFee.value);
        break;
      case 'usd':
        if (fromToken.currentPrice && fromToken.currentPrice > 0) {
          feeAmount = parseFloat(conversionFee.value) / fromToken.currentPrice;
        }
        break;
    }

    // Calculate final amounts
    const amountAfterFee = amount - feeAmount;
    if (amountAfterFee <= 0) {
      throw new BadRequestException('Amount after fee must be greater than 0');
    }

    const toAmount = amountAfterFee * exchangeRate;

    // Start transaction
    return this.dataSource.transaction(async (manager) => {
      // Get wallet IDs first
      const fromWallet = await this.walletRepository.findOne({ 
        where: { 
          userId,
          blockchain: (await this.tokenRepository.findOne({ where: { id: fromTokenId } })).blockchain 
        }
      });
      const toWallet = await this.walletRepository.findOne({ 
        where: { 
          userId,
          blockchain: (await this.tokenRepository.findOne({ where: { id: toTokenId } })).blockchain 
        }
      });

      // Create conversion record
      const conversion = manager.create(Conversion, {
        userId,
        fromTokenId,
        toTokenId,
        fromAmount: amount,
        toAmount,
        exchangeRate,
        feeAmount,
        feeType: conversionFee.type,
      });

      // Update source balance
      await this.walletBalanceRepository.update(
        { 
          userId,
          baseSymbol: fromToken.baseSymbol || fromToken.symbol,
          type: 'funding'
        },
        {
          balance: () => `CAST(balance AS DECIMAL) - ${amount}`
        }
      );

      // Update destination balance
      await this.walletBalanceRepository.update(
        { 
          userId,
          baseSymbol: (await this.tokenRepository.findOne({ where: { id: toTokenId } })).baseSymbol,
          type: 'funding'
        },
        {
          balance: () => `CAST(balance AS DECIMAL) + ${toAmount}`
        }
      );

      // Save conversion record
      await manager.save(conversion);

      // Send email notification
      await this.emailService.sendConversionConfirmation({
        to: (await this.userRepository.findOne({ where: { id: userId } })).email,
        data: {
          fromAmount: amount,
          fromToken: (await this.tokenRepository.findOne({ where: { id: fromTokenId } })).symbol,
          toAmount,
          toToken: (await this.tokenRepository.findOne({ where: { id: toTokenId } })).symbol,
          fee: feeAmount,
          feeType: conversionFee.type,
          date: new Date(),
        },
      });

      return conversion;
    });
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: 'deposit' | 'withdrawal' | 'conversion' | 'transfer'
  ) {
    this.logger.debug(`[getTransactionHistory] Starting for user ${userId}`);
    this.logger.debug(`[getTransactionHistory] Parameters: page=${page}, limit=${limit}, type=${type || 'all'}`);

    const skip = (page - 1) * limit;
    this.logger.debug(`[getTransactionHistory] Calculated skip: ${skip}`);

    let query = `
      SELECT
        d.id,
        'deposit' as type,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM d.amount::text)) as amount,
        t.symbol as "tokenSymbol",
        d.status::varchar as status,
        d."createdAt" as "createdAt",
        d.metadata
      FROM deposits d
      INNER JOIN tokens t ON d."tokenId" = t.id
      WHERE d."userId" = $1

        UNION ALL

      SELECT
        w.id,
        'withdrawal' as type,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM w.amount::text)) as amount,
        t.symbol as "tokenSymbol",
        w.status::varchar as status,
        w."createdAt" as "createdAt",
        w.metadata
      FROM withdrawals w
      INNER JOIN tokens t ON w."tokenId" = t.id
      WHERE w."userId" = $1

        UNION ALL

      SELECT
        c.id,
        'conversion' as type,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM c."fromAmount"::text)) as amount,
        ft.symbol as "tokenSymbol",
        c.status::varchar as status,
        c."createdAt" as "createdAt",
        json_build_object(
          'toAmount', TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM c."toAmount"::text)),
          'toToken', tt.symbol,
          'exchangeRate', c."exchangeRate"
        )::jsonb as metadata
      FROM conversions c
      INNER JOIN tokens ft ON c."fromTokenId" = ft.id
      INNER JOIN tokens tt ON c."toTokenId" = tt.id
      WHERE c."userId" = $1

        UNION ALL

      SELECT
        tr.id,
        'transfer' as type,
        TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM tr.amount::text)) as amount,
        t.symbol as "tokenSymbol",
        tr.status::varchar as status,
        tr."createdAt" as "createdAt",
        json_build_object(
          'fromType', tr."fromType",
          'toType', tr."toType"
        )::jsonb as metadata
      FROM transfers tr
      INNER JOIN tokens t ON tr."tokenId" = t.id
      WHERE tr."userId" = $1
    `;

    if (type) {
      switch (type) {
        case 'deposit':
          query = `
            SELECT
              d.id,
              'deposit' as type,
              TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM d.amount::text)) as amount,
              t.symbol as "tokenSymbol",
              d.status::varchar as status,
              d."createdAt" as "createdAt",
              d.metadata
            FROM deposits d
            INNER JOIN tokens t ON d."tokenId" = t.id
            WHERE d."userId" = $1
          `;
          break;
        case 'withdrawal':
          query = `
            SELECT
              w.id,
              'withdrawal' as type,
              TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM w.amount::text)) as amount,
              t.symbol as "tokenSymbol",
              w.status::varchar as status,
              w."createdAt" as "createdAt",
              w.metadata
            FROM withdrawals w
            INNER JOIN tokens t ON w."tokenId" = t.id
            WHERE w."userId" = $1
          `;
          break;
        case 'conversion':
          query = `
            SELECT
              c.id,
              'conversion' as type,
              TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM c."fromAmount"::text)) as amount,
              ft.symbol as "tokenSymbol",
              c.status::varchar as status,
              c."createdAt" as "createdAt",
              json_build_object(
                'toAmount', TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM c."toAmount"::text)),
                'toToken', tt.symbol,
                'exchangeRate', c."exchangeRate"
              )::jsonb as metadata
            FROM conversions c
            INNER JOIN tokens ft ON c."fromTokenId" = ft.id
            INNER JOIN tokens tt ON c."toTokenId" = tt.id
            WHERE c."userId" = $1
          `;
          break;
        case 'transfer':
          query = `
            SELECT
              tr.id,
              'transfer' as type,
              TRIM(TRAILING '0' FROM TRIM(TRAILING '.' FROM tr.amount::text)) as amount,
              t.symbol as "tokenSymbol",
              tr.status::varchar as status,
              tr."createdAt" as "createdAt",
              json_build_object(
                'fromType', tr."fromType",
                'toType', tr."toType"
              )::jsonb as metadata
            FROM transfers tr
            INNER JOIN tokens t ON tr."tokenId" = t.id
            WHERE tr."userId" = $1
          `;
          break;
      }
    }

    query += ` ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`;

    const countQuery = `
      SELECT (
        (SELECT COUNT(*) FROM deposits WHERE "userId" = $1) +
        (SELECT COUNT(*) FROM withdrawals WHERE "userId" = $1) +
        (SELECT COUNT(*) FROM conversions WHERE "userId" = $1) +
        (SELECT COUNT(*) FROM transfers WHERE "userId" = $1)
      ) as count
    `;

    this.logger.debug('[getTransactionHistory] Executing queries');

    try {
      const [transactions, countResult] = await Promise.all([
        this.dataSource.query(query, [userId, limit, skip]),
        this.dataSource.query(countQuery, [userId])
      ]);

      // Format the transactions
      const formattedTransactions = transactions.map(tx => ({
        ...tx,
        amount: tx.amount || '0',
        createdAt: new Date(tx.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      }));

      const totalCount = parseInt(countResult[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      this.logger.debug(`[getTransactionHistory] Found ${formattedTransactions.length} transactions`);

      return {
        transactions: formattedTransactions,
        totalCount,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      this.logger.error('[getTransactionHistory] Error executing queries:', error.message);
      this.logger.error(error.stack);
      throw error;
    }
  }

  async getTransactionDetails(userId: string, transactionId: string) {
    this.logger.debug(`[getTransactionDetails] Getting details for transaction ${transactionId}`);

    // Try to find in deposits
    const deposit = await this.depositRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['token'],
    });

    if (deposit) {
      return {
        id: deposit.id,
        type: 'deposit',
        amount: deposit.amount,
        tokenSymbol: deposit.token.symbol,
        status: deposit.status,
        createdAt: deposit.createdAt.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        metadata: deposit.metadata,
        txHash: deposit.txHash,
        blockchain: deposit.blockchain,
        network: deposit.network,
        networkVersion: deposit.networkVersion,
        blockNumber: deposit.blockNumber,
        fee: deposit.metadata?.fee,
        from: deposit.metadata?.from,
      };
    }
    // Try to find in withdrawals
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['token'],
    });

    if (withdrawal) {
      return {
        id: withdrawal.id,
        type: 'withdrawal',
        amount: withdrawal.amount,
        tokenSymbol: withdrawal.token.symbol,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        metadata: withdrawal.metadata,
        networkVersion: withdrawal.networkVersion,
        network: withdrawal.network,
        address: withdrawal.address,
        memo: withdrawal.memo,
        fee: withdrawal.fee?.toString(),
        txHash: withdrawal.txHash,
      };
    }

    // Try to find in conversions
    const conversion = await this.conversionRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['fromToken', 'toToken'],
    });

    if (conversion) {
      return {
        id: conversion.id,
        type: 'conversion',
        amount: conversion.fromAmount,
        tokenSymbol: conversion.fromToken.symbol,
        status: conversion.status,
        createdAt: conversion.createdAt.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        toAmount: conversion.toAmount,
        toToken: conversion.toToken.symbol,
        exchangeRate: conversion.exchangeRate,
      };
    }

    // Try to find in transfers
    const transfer = await this.transferRepository.findOne({
      where: { id: transactionId, userId },
      relations: ['token'],
    });

    if (transfer) {
      return {
        id: transfer.id,
        type: 'transfer',
        amount: transfer.amount,
        tokenSymbol: transfer.token.symbol,
        status: transfer.status,
        createdAt: transfer.createdAt.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        metadata: transfer.metadata,
        fromType: transfer.fromType,
        toType: transfer.toType,
      };
    }

    throw new NotFoundException('Transaction not found');
  }
}