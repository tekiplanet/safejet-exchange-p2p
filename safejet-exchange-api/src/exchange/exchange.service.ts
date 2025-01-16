import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ExchangeRate } from './exchange-rate.entity';
import { Token } from '../wallet/entities/token.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { CoinCache } from './interfaces/coin-cache.interface';

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private readonly exchangeApiUrl = 'https://api.exchangerate-api.com/v4/latest';
  private readonly cryptoApiUrl = 'https://min-api.cryptocompare.com/data'; // Free crypto API
  private readonly updateInterval: number;
  private ratesCache: Map<string, { rates: any, timestamp: number }> = new Map();
  private cryptoPricesCache: Map<string, { price: number, timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
  private readonly PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly priceCache: Map<string, { price: number, timestamp: number }> = new Map();

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(Currency)
    private currencyRepository: Repository<Currency>,
    private configService: ConfigService,
  ) {
    this.updateInterval = this.configService.get<number>('exchange.updateInterval');
  }

  async getCryptoPrice(symbol: string, currency: string): Promise<number> {
    try {
      const cacheKey = `${symbol}-${currency}`;
      const cached = this.cryptoPricesCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.price;
      }

      // Direct call to CryptoCompare API
      const response = await axios.get(`${this.cryptoApiUrl}/price`, {
        params: {
          fsym: symbol.toUpperCase(),
          tsyms: currency.toUpperCase()
        }
      });

      const price = response.data[currency.toUpperCase()] ?? 0;

      this.cryptoPricesCache.set(cacheKey, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      this.logger.error(`Failed to get crypto price for ${symbol}: ${error.message}`);
      
      // Return cached price even if expired in case of API failure
      const cached = this.cryptoPricesCache.get(`${symbol}-${currency}`);
      return cached?.price ?? 0;
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
} 