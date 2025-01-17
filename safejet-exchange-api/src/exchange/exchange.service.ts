import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ExchangeRate } from './exchange-rate.entity';
import { Token } from '../wallet/entities/token.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { CoinCache } from './interfaces/coin-cache.interface';

// Add interface for price options
interface PriceOptions {
  timestamp?: '24h' | 'current';
  onlyCached?: boolean;
}

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private readonly exchangeApiUrl = 'https://api.exchangerate-api.com/v4/latest';
  private readonly cryptoApiUrl = 'https://min-api.cryptocompare.com/data'; // Free crypto API
  private readonly updateInterval: number;
  private ratesCache: Map<string, { rates: any, timestamp: number }> = new Map();
  private cryptoPricesCache: Map<string, { price: number, timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3 * 60 * 1000; // 3 minute cache
  private readonly PRICE_CACHE_DURATION =  10 * 1000; // 30 seconds cache
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(Currency)
    private currencyRepository: Repository<Currency>,
    private configService: ConfigService,
  ) {
    this.updateInterval = this.configService.get<number>('exchange.updateInterval');
  }

  async getCryptoPrice(symbol: string, currency: string = 'USD'): Promise<number> {
    try {
      // Check cache first
      const cacheKey = `${symbol}-${currency}`;
      const cachedData = this.priceCache.get(cacheKey);
      
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_DURATION) {
        return cachedData.price;
      }

      // If not in cache or expired, fetch new price
      const price = await this.fetchPrice(symbol, currency);
      
      // Update cache
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      this.logger.error(`Failed to get price for ${symbol}: ${error.message}`);
      // Return cached price if available, even if expired
      const cachedData = this.priceCache.get(`${symbol}-${currency}`);
      if (cachedData) {
        return cachedData.price;
      }
      throw error;
    }
  }

  // Update method signature to accept options
  async getBatchPrices(
    symbols: string[], 
    options: PriceOptions = { timestamp: 'current', onlyCached: false }
  ): Promise<Record<string, number>> {
    try {
      const prices: Record<string, number> = {};
      const uncachedSymbols: string[] = [];

      // Check cache first
      for (const symbol of symbols) {
        const cacheKey = `${symbol}-${options.timestamp}`;
        const cached = this.priceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
          prices[symbol] = cached.price;
        } else if (!options.onlyCached) {
          uncachedSymbols.push(symbol);
        }
      }

      // Only fetch uncached prices if not onlyCached
      if (!options.onlyCached && uncachedSymbols.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
          const batch = uncachedSymbols.slice(i, i + batchSize);
          
          // Process batch with delay between each token
          await Promise.all(
            batch.map(async (symbol, index) => {
              try {
                // Add small delay between requests
                await new Promise(resolve => setTimeout(resolve, index * 200));

                if (options.timestamp === '24h') {
                  const priceData = await this.getCryptoPriceChange(symbol, 'USD');
                  this.logger.log(`${symbol} Price Change Data:`, priceData);
                  
                  const price24h = priceData.price / (1 + (priceData.changePercent24h / 100));
                  prices[symbol] = price24h || 0;
                  
                  this.logger.log(`${symbol} Calculated 24h Price: $${price24h}`);
                } else {
                  let retries = 3;
                  let currentPrice = 0;
                  
                  while (retries > 0 && currentPrice === 0) {
                    currentPrice = await this.getCryptoPrice(symbol, 'USD');
                    if (currentPrice === 0) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      retries--;
                    }
                  }
                  
                  prices[symbol] = currentPrice;
                  this.logger.log(`${symbol} Current Price: $${currentPrice}`);
                }
              } catch (error) {
                this.logger.warn(`Failed to get price for ${symbol}: ${error.message}`);
                prices[symbol] = 0;
              }
            })
          );

          // Add delay between batches
          if (i + batchSize < uncachedSymbols.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Cache the new prices
        for (const [symbol, price] of Object.entries(prices)) {
          const cacheKey = `${symbol}-${options.timestamp}`;
          this.priceCache.set(cacheKey, {
            price,
            timestamp: Date.now()
          });
        }
      }

      return prices;
    } catch (error) {
      this.logger.error(`Failed to get batch prices: ${error.message}`);
      throw error;
    }
  }

  // Convert crypto amount to fiat value
  async convertCryptoToFiat(amount: number, cryptoSymbol: string, fiatCurrency: string): Promise<number> {
    const price = await this.getCryptoPrice(cryptoSymbol, fiatCurrency);
    return amount * price;
  }

  private async fetchAndSaveRate(currency: string): Promise<ExchangeRate> {
    try {
      // Check cache first
      const cacheKey = currency.toUpperCase();
      const cached = this.ratesCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.CACHE_DURATION)) {
        this.logger.debug(`Using cached rates for ${currency}`);
        const rate = this.exchangeRateRepository.create({
          currency: currency.toLowerCase(),
          rate: cached.rates[currency.toUpperCase()],
        });
        return this.exchangeRateRepository.save(rate);
      }

      // Fetch fresh rates
      const response = await axios.get(`${this.exchangeApiUrl}/USD`);
      const rates = response.data.rates;

      // Cache the response
      this.ratesCache.set('USD', {
        rates,
        timestamp: Date.now()
      });

      // Get rate for requested currency
      const rate = this.exchangeRateRepository.create({
        currency: currency.toLowerCase(),
        rate: rates[currency.toUpperCase()],
      });

      this.logger.log(`Updated exchange rate for ${currency}: ${rate.rate}`);
      return this.exchangeRateRepository.save(rate);

    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate for ${currency}:`, error);
      
      const lastRate = await this.exchangeRateRepository.findOne({
        where: { currency: currency.toLowerCase() }
      });
      
      if (lastRate) {
        this.logger.warn(`Using last known rate for ${currency} from ${lastRate.lastUpdated}`);
        return lastRate;
      }
      
      throw new Error(`Failed to get exchange rate for ${currency}`);
    }
  }

  async getRateForCurrency(currency: string): Promise<ExchangeRate> {
    const currencyEntity = await this.currencyRepository.findOne({
      where: { code: currency.toUpperCase() }
    });

    if (!currencyEntity) {
      throw new Error(`Currency ${currency} is not supported`);
    }

    const rate = await this.exchangeRateRepository.findOne({
      where: { currency: currency.toLowerCase() }
    });

    if (!rate || this.isRateStale(rate)) {
      return this.fetchAndSaveRate(currency.toLowerCase());
    }

    return rate;
  }

  private isRateStale(rate: ExchangeRate): boolean {
    return new Date().getTime() - rate.lastUpdated.getTime() > this.updateInterval;
  }

  async updateAllRates(): Promise<void> {
    const currencies = await this.currencyRepository.find();
    for (const currency of currencies) {
      await this.fetchAndSaveRate(currency.code.toLowerCase());
    }
  }

  async getCryptoPriceChange(symbol: string, currency: string = 'USD'): Promise<{
    price: number;
    change24h: number;
    changePercent24h: number;
  }> {
    try {
      this.logger.log(`Getting price change data for ${symbol}`);
      // Get price change data from CryptoCompare
      const response = await axios.get(`${this.cryptoApiUrl}/pricemultifull`, {
        params: {
          fsyms: symbol.toUpperCase(),
          tsyms: currency.toUpperCase()
        }
      });

      const data = response.data.RAW?.[symbol.toUpperCase()]?.[currency.toUpperCase()];
      if (!data) {
        return { price: 0, change24h: 0, changePercent24h: 0 };
      }

      return {
        price: data.PRICE ?? 0,
        change24h: data.CHANGE24HOUR ?? 0,
        changePercent24h: data.CHANGEPCT24HOUR ?? 0
      };
    } catch (error) {
      this.logger.error(`Failed to get crypto price change for ${symbol}: ${error.message}`);
      return { price: 0, change24h: 0, changePercent24h: 0 };
    }
  }

  private async fetchPrice(symbol: string, currency: string): Promise<number> {
    try {
      const response = await axios.get(`${this.cryptoApiUrl}/price`, {
        params: {
          fsym: symbol.toUpperCase(),
          tsyms: currency.toUpperCase()
        }
      });
      
      return response.data[currency.toUpperCase()] ?? 0;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}: ${error.message}`);
      return 0;
    }
  }

  private async fetchBatchPrices(symbols: string[], currency: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(`${this.cryptoApiUrl}/pricemulti`, {
        params: {
          fsyms: symbols.join(',').toUpperCase(),
          tsyms: currency.toUpperCase()
        }
      });
      
      const prices: Record<string, number> = {};
      for (const symbol of symbols) {
        prices[symbol] = response.data[symbol.toUpperCase()]?.[currency.toUpperCase()] ?? 0;
      }
      
      return prices;
    } catch (error) {
      this.logger.error(`Failed to fetch batch prices: ${error.message}`);
      return symbols.reduce((acc, symbol) => ({ ...acc, [symbol]: 0 }), {});
    }
  }
} 