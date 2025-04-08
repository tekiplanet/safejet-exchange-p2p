import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { WalletService } from '../wallet/wallet.service';
import { ExchangeService } from '../exchange/exchange.service';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly walletService: WalletService,
    private readonly exchangeService: ExchangeService,
  ) {}

  /**
   * Get portfolio summary for a user
   * @param userId - User ID
   * @param currency - Currency for conversion (default: USD)
   * @param timeframe - Timeframe for portfolio changes (24h, 7d, 30d)
   */
  async getPortfolioSummary(userId: string, currency: string = 'USD', timeframe: string = '24h') {
    try {
      this.logger.log(`Getting portfolio summary for user ${userId} with currency ${currency} and timeframe ${timeframe}`);
      
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
} 