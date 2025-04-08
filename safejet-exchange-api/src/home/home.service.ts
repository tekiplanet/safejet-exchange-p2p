import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { WalletService } from '../wallet/wallet.service';
import { ExchangeService } from '../exchange/exchange.service';
import { MarketOverviewResponse } from './dto/market-overview.dto';
import { TrendingTokensResponse } from './dto/trending-tokens.dto';
import { NewsResponse } from './dto/news.dto';
import { MarketListResponse } from './dto/market-list.dto';
import { News } from '../news/entities/news.entity';
import { PlatformSettings } from '../platform/entities/platform-settings.entity';
import { ContactInfoResponse } from './dto/contact-info.dto';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
    @InjectRepository(PlatformSettings)
    private readonly platformSettingsRepository: Repository<PlatformSettings>,
    private readonly walletService: WalletService,
    private readonly exchangeService: ExchangeService,
  ) {}

  /**
   * Get Bitcoin market overview data
   */
  async getBitcoinMarketOverview(): Promise<MarketOverviewResponse> {
    try {
      const btc = await this.tokenRepository.findOne({
        where: { symbol: 'BTC' }
      });

      if (!btc) {
        throw new BadRequestException('Bitcoin data not found');
      }

      // Calculate price change percentage
      const priceChange24h = btc.currentPrice && btc.price24h
        ? ((btc.currentPrice - btc.price24h) / btc.price24h) * 100
        : 0;

      // Use the price history directly as it's already a parsed array
      const chartData: Array<[number, number]> = btc.priceHistory || [];

      return {
        price: btc.currentPrice?.toString() || '0',
        priceChange24h,
        marketCap: btc.marketCap?.toString() || '0',
        volume24h: btc.volume24h?.toString() || '0',
        dominance: 45.2, // TODO: Calculate actual BTC dominance
        circulatingSupply: btc.circulatingSupply?.toString() || '0',
        chartData,
      };
    } catch (error) {
      this.logger.error('Error getting Bitcoin market overview:', error);
      throw new BadRequestException(`Failed to get Bitcoin market overview: ${error.message}`);
    }
  }

  /**
   * Get portfolio summary for a user
   * @param userId - User ID
   * @param currency - Currency for conversion (default: USD)
   * @param timeframe - Timeframe for portfolio changes (24h, 7d, 30d)
   */
  async getPortfolioSummary(userId: string, currency: string = 'USD', timeframe: string = '24h') {
    try {
      this.logger.log(`Getting portfolio summary for user ${userId} with currency ${currency} and timeframe ${timeframe}`);
      
      // Check if user has any wallets
      const wallets = await this.walletService.getWallets(userId);
      this.logger.log(`User ${userId} has ${wallets.length} wallets`);
      
      if (wallets.length === 0) {
        this.logger.warn(`No wallets found for user ${userId}`);
        return this._getEmptyPortfolioResponse(currency, timeframe);
      }
      
      // Ensure wallet balances are initialized
      for (const wallet of wallets) {
        await this.walletService.ensureWalletBalances(wallet.id);
      }
      
      // Get exchange rate first (like in WalletsTab)
      let exchangeRate = 1.0;
      if (currency.toUpperCase() !== 'USD') {
        try {
          const rateResponse = await this.exchangeService.getRates(currency);
          exchangeRate = parseFloat(rateResponse.rate || '1.0');
          this.logger.log(`Got exchange rate for ${currency}: ${exchangeRate}`);
        } catch (error) {
          this.logger.error(`Error getting exchange rate for ${currency}:`, error);
          exchangeRate = 1.0; // Default to 1.0 if there's an error
        }
      }
      
      // Get spot balances (increase limit to 500 to ensure we get all balances)
      this.logger.log('Fetching spot balances...');
      const spotBalancesResponse = await this.walletService.getBalances(
        userId, 
        'spot', 
        { page: 1, limit: 500 }
      );
      
      // Get funding balances
      this.logger.log('Fetching funding balances...');
      const fundingBalancesResponse = await this.walletService.getBalances(
        userId, 
        'funding', 
        { page: 1, limit: 500 }
      );
      
      this.logger.log(`Received spot balances: ${spotBalancesResponse.balances?.length || 0} items, total: ${spotBalancesResponse.total || '0'}`);
      this.logger.log(`Received funding balances: ${fundingBalancesResponse.balances?.length || 0} items, total: ${fundingBalancesResponse.total || '0'}`);

      // Create a map to combine balances by symbol
      const combinedBalancesMap = new Map<string, any>();
      
      // Process spot balances first
      if (spotBalancesResponse.balances && Array.isArray(spotBalancesResponse.balances)) {
        for (const balance of spotBalancesResponse.balances) {
          if (!balance.token) continue;
          
          const symbol = balance.token.symbol;
          const currentBalance = parseFloat(balance.balance || '0');
          const currentUsdValue = parseFloat(balance.usdValue || '0');
          
          combinedBalancesMap.set(symbol, {
            ...balance,
            balance: currentBalance.toString(),
            usdValue: currentUsdValue.toString(),
            sourceType: 'spot'
          });
        }
      }
      
      // Add funding balances, combining with spot balances where symbols match
      if (fundingBalancesResponse.balances && Array.isArray(fundingBalancesResponse.balances)) {
        for (const balance of fundingBalancesResponse.balances) {
          if (!balance.token) continue;
          
          const symbol = balance.token.symbol;
          const currentBalance = parseFloat(balance.balance || '0');
          const currentUsdValue = parseFloat(balance.usdValue || '0');
          
          if (combinedBalancesMap.has(symbol)) {
            // Add to existing balance
            const existing = combinedBalancesMap.get(symbol);
            const existingBalance = parseFloat(existing.balance);
            const existingUsdValue = parseFloat(existing.usdValue);
            
            combinedBalancesMap.set(symbol, {
              ...existing,
              balance: (existingBalance + currentBalance).toString(),
              usdValue: (existingUsdValue + currentUsdValue).toString(),
              sourceType: 'combined'
            });
          } else {
            // Add as new balance
            combinedBalancesMap.set(symbol, {
              ...balance,
              balance: currentBalance.toString(),
              usdValue: currentUsdValue.toString(),
              sourceType: 'funding'
            });
          }
        }
      }
      
      // Convert map to array and sort by USD value (descending)
      const combinedBalances = Array.from(combinedBalancesMap.values())
        .filter(balance => parseFloat(balance.balance) > 0)
        .sort((a, b) => {
          const aUsdValue = parseFloat(a.usdValue || '0');
          const bUsdValue = parseFloat(b.usdValue || '0');
          return bUsdValue - aUsdValue; // Descending order
        });
      
      this.logger.log(`Combined ${combinedBalances.length} balances with non-zero values`);
      
      // Calculate portfolio totals
      const usdBalance = combinedBalances.reduce(
        (sum, balance) => sum + parseFloat(balance.usdValue || '0'), 
        0
      );
      
      // Calculate 24h change by combining changes from both wallets
      const usdChange24h = parseFloat(spotBalancesResponse.change24h || '0') + 
                          parseFloat(fundingBalancesResponse.change24h || '0');
      
      // Calculate change percentage based on the total if we have a balance
      let changePercent24h = 0;
      if (usdBalance > 0) {
        changePercent24h = (usdChange24h / usdBalance) * 100;
      }
      
      this.logger.log(`Portfolio summary: USD Value: ${usdBalance}, 24h Change: ${usdChange24h}, Change %: ${changePercent24h}`);
      
      // Calculate allocation based on combined balances
      const allocation = this._calculateAllocation(combinedBalances);
      
      // Prepare the response data
      return {
        portfolio: {
          usdValue: usdBalance,
          localCurrencyValue: usdBalance * exchangeRate,
          currency,
          exchangeRate,
          change: {
            value: usdChange24h,
            valueInLocalCurrency: usdChange24h * exchangeRate,
            percent: changePercent24h,
            timeframe,
          },
        },
        spotBalances: {
          total: parseFloat(spotBalancesResponse.total || '0'),
          change24h: parseFloat(spotBalancesResponse.change24h || '0'),
        },
        fundingBalances: {
          total: parseFloat(fundingBalancesResponse.total || '0'),
          change24h: parseFloat(fundingBalancesResponse.change24h || '0'),
        },
        allocation,
        balances: combinedBalances,
        marketStats: await this._getMarketStats(currency),
        chartData: await this._getChartData(userId, timeframe),
      };
    } catch (error) {
      this.logger.error('Error in getPortfolioSummary:', error);
      throw new BadRequestException(`Failed to get portfolio summary: ${error.message}`);
    }
  }

  private _getEmptyPortfolioResponse(currency: string, timeframe: string) {
    return {
      portfolio: {
        usdValue: 0,
        localCurrencyValue: 0,
        currency,
        exchangeRate: 1,
        change: {
          value: 0,
          valueInLocalCurrency: 0,
          percent: 0,
          timeframe,
        },
      },
      allocation: [],
      balances: [],
      marketStats: {
        totalMarketCap: 0,
        marketCapChange24h: 0,
        btcDominance: 0,
        volume24h: 0,
        activePairs: 0,
      },
      chartData: [],
    };
  }

  /**
   * Calculate allocation of tokens in the portfolio
   */
  private _calculateAllocation(balances: any[]) {
    const totalValue = balances.reduce(
      (sum, balance) => sum + parseFloat(balance.usdValue || '0'),
      0
    );

    if (totalValue === 0) {
      return [];
    }

    // Map balances to allocation data with percentages
    return balances
      .map(balance => {
        const usdValue = parseFloat(balance.usdValue || '0');
        const percentage = (usdValue / totalValue) * 100;
        
        // Only include tokens with non-zero value
        if (usdValue > 0) {
          return {
            token: balance.token,
            percentage,
            value: usdValue,
          };
        }
        return null;
      })
      .filter(item => item !== null)
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  }

  /**
   * Get portfolio chart data for visualization
   */
  private async _getChartData(userId: string, timeframe: string) {
    // In a real implementation, this would fetch historical data
    // For now, we'll return dummy data
    
    const dataPoints = {
      '24h': 24,
      '7d': 7,
      '30d': 30,
    }[timeframe] || 24;

    // Generate some reasonable-looking random data
    const startValue = 10000 + Math.random() * 5000;
    const volatility = 0.03; // 3% volatility
    
    let currentValue = startValue;
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
      // Random walk with slight upward bias
      const change = currentValue * (Math.random() * volatility * 2 - volatility + 0.002);
      currentValue += change;
      
      // Calculate timestamp
      const date = new Date();
      
      switch (timeframe) {
        case '7d':
          date.setDate(date.getDate() - 7 + i);
          break;
        case '30d':
          date.setDate(date.getDate() - 30 + i);
          break;
        case '24h':
        default:
          date.setHours(date.getHours() - 24 + i);
          break;
      }
      
      data.push({
        timestamp: date.toISOString(),
        value: currentValue,
      });
    }
    
    return data;
  }

  /**
   * Get general market statistics
   */
  private async _getMarketStats(currency: string) {
    try {
      // In a real implementation, this would fetch real market data
      // For now, we'll return static data
      
      return {
        totalMarketCap: 1230000000000, // $1.23T
        marketCapChange24h: 2.3, // +2.3%
        btcDominance: 43.2, // 43.2%
        volume24h: 84200000000, // $84.2B
        activePairs: 12234, // 12,234 trading pairs
      };
    } catch (error) {
      this.logger.error('Error fetching market stats:', error);
      return {
        totalMarketCap: 0,
        marketCapChange24h: 0,
        btcDominance: 0,
        volume24h: 0,
        activePairs: 0,
      };
    }
  }

  /**
   * Get trending tokens sorted by 24h price change
   */
  async getTrendingTokens(): Promise<TrendingTokensResponse> {
    try {
      const tokens = await this.tokenRepository.find({
        where: { isActive: true },
      });

      // Calculate price change for each token
      const tokensWithPriceChange = tokens.map(token => {
        const priceChange = token.currentPrice && token.price24h
          ? ((token.currentPrice - token.price24h) / token.price24h) * 100
          : 0;

        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          baseSymbol: token.baseSymbol || token.symbol,
          networkVersion: token.networkVersion,
          blockchain: token.blockchain,
          currentPrice: token.currentPrice?.toString() || '0',
          priceChange24h: priceChange,
          metadata: token.metadata,
        };
      });

      // Group tokens by baseSymbol
      const tokenGroups = new Map();
      
      tokensWithPriceChange.forEach(token => {
        const baseSymbol = token.baseSymbol;
        
        if (!tokenGroups.has(baseSymbol)) {
          tokenGroups.set(baseSymbol, {
            symbol: token.symbol,
            name: token.name.replace(/ \([^)]+\)$/, ''), // Remove network suffix from name
            baseSymbol: baseSymbol,
            variants: [],
            currentPrice: token.currentPrice,
            priceChange24h: token.priceChange24h,
            metadata: token.metadata,
          });
        }
        
        const group = tokenGroups.get(baseSymbol);
        group.variants.push({
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          networkVersion: token.networkVersion,
          blockchain: token.blockchain,
        });
        
        // Update group if this variant has a higher price change
        if (token.priceChange24h > group.priceChange24h) {
          group.priceChange24h = token.priceChange24h;
          group.currentPrice = token.currentPrice;
        }
      });
      
      // Convert to array, filter positive changes, sort, and slice
      const trendingTokens = Array.from(tokenGroups.values())
        .filter(group => group.priceChange24h > 0) // Only positive price changes
        .sort((a, b) => b.priceChange24h - a.priceChange24h) // Sort by price change DESC
        .slice(0, 10); // Get top 10

      return { tokens: trendingTokens };
    } catch (error) {
      this.logger.error('Error getting trending tokens:', error);
      throw new BadRequestException(`Failed to get trending tokens: ${error.message}`);
    }
  }

  /**
   * Get recent news and updates
   */
  async getRecentNews(): Promise<NewsResponse> {
    try {
      const news = await this.newsRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: 4
      });

      return { news };
    } catch (error) {
      this.logger.error('Error getting recent news:', error);
      throw new BadRequestException(`Failed to get recent news: ${error.message}`);
    }
  }

  /**
   * Get market tokens with unified networks
   * @param limit - Number of tokens to return (default: 10)
   */
  async getMarketTokens(): Promise<any> {
    try {
      this.logger.log('Fetching market tokens...');
      const tokens = await this.tokenRepository.find({
        where: { isActive: true },
        order: { volume24h: 'DESC' },
      });

      this.logger.log(`Found ${tokens.length} tokens`);
      if (tokens.length > 0) {
        this.logger.log('Sample token data:', {
          id: tokens[0].id,
          symbol: tokens[0].symbol,
          baseSymbol: tokens[0].baseSymbol,
          name: tokens[0].name,
          currentPrice: tokens[0].currentPrice,
          price24h: tokens[0].price24h,
          volume24h: tokens[0].volume24h,
        });
      }

      // Group tokens by baseSymbol and use the highest volume variant
      const tokenGroups = new Map();
      
      tokens.forEach(token => {
        const baseSymbol = token.baseSymbol || token.symbol;
        const currentPrice = parseFloat(token.currentPrice?.toString() || '0');
        const price24h = parseFloat(token.price24h?.toString() || '0');
        const priceChange = price24h > 0 
          ? ((currentPrice - price24h) / price24h) * 100 
          : 0;

        if (!tokenGroups.has(baseSymbol) || 
            (token.volume24h || 0) > (tokenGroups.get(baseSymbol).volume24h || 0)) {
          tokenGroups.set(baseSymbol, {
            id: token.id,
            symbol: token.symbol,
            baseSymbol: baseSymbol,
            name: token.name.replace(/ \([^)]+\)$/, ''),
            currentPrice: currentPrice.toString(),
            priceChange24h: priceChange,
            volume24h: token.volume24h?.toString() || '0',
            metadata: token.metadata,
          });
        }
      });

      const marketTokens = Array.from(tokenGroups.values());
      this.logger.log(`Processed ${marketTokens.length} market tokens`);
      if (marketTokens.length > 0) {
        this.logger.log('Sample processed token:', marketTokens[0]);
      }

      return { tokens: marketTokens };
    } catch (error) {
      this.logger.error('Error fetching market tokens:', error);
      throw new BadRequestException('Failed to fetch market tokens');
    }
  }

  /**
   * Get platform contact information
   */
  async getContactInfo(): Promise<ContactInfoResponse> {
    try {
      this.logger.log('Fetching contact information');
      const settings = await this.platformSettingsRepository.find({
        where: { category: 'contact' },
      });

      this.logger.log(`Found ${settings.length} contact settings`);

      const getValue = (key: string) => {
        const setting = settings.find(s => s.key === key);
        return setting?.value || '';
      };

      const parseJsonValue = (key: string, defaultValue: any = {}) => {
        try {
          const value = getValue(key);
          return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
          this.logger.error(`Error parsing JSON for ${key}:`, error);
          return defaultValue;
        }
      };

      return {
        contactEmail: getValue('contactEmail'),
        supportPhone: getValue('supportPhone'),
        emergencyContact: parseJsonValue('emergencyContact', {
          phone: '',
          email: '',
          supportLine: '',
        }),
        companyAddress: parseJsonValue('companyAddress', {
          street: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
        }),
        socialMedia: parseJsonValue('socialMedia', {
          facebook: '',
          twitter: '',
          instagram: '',
          tiktok: '',
          telegram: '',
          discord: '',
          whatsapp: '',
          wechat: '',
          linkedin: '',
          youtube: '',
        }),
        supportLinks: parseJsonValue('supportLinks', {
          helpCenter: '',
          supportTickets: '',
          faq: '',
          knowledgeBase: '',
        }),
      };
    } catch (error) {
      this.logger.error('Error getting contact information:', error);
      throw new BadRequestException(`Failed to get contact information: ${error.message}`);
    }
  }
} 