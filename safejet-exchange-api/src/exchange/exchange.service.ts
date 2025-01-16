import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExchangeRate } from './exchange-rate.entity';
import { Token } from '../wallet/entities/token.entity';
import { Currency } from '../currencies/entities/currency.entity';

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private readonly coingeckoApiUrl: string;
  private readonly updateInterval: number;

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(Currency)
    private currencyRepository: Repository<Currency>,
    private configService: ConfigService,
  ) {
    this.coingeckoApiUrl = this.configService.get<string>('exchange.coingeckoApiUrl');
    this.updateInterval = this.configService.get<number>('exchange.updateInterval');
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

  private async fetchAndSaveRate(currency: string): Promise<ExchangeRate> {
    try {
      // Get all active tokens
      const tokens = await this.tokenRepository.find({
        where: { isActive: true }
      });

      // First get the coin list or search for each token
      const coinPromises = tokens.map(async token => {
        try {
          // Search for the token by symbol
          const searchResponse = await axios.get(
            `${this.coingeckoApiUrl}/search`,
            {
              params: {
                query: token.symbol,
              }
            }
          );

          // Get the first matching coin (most relevant)
          const coin = searchResponse.data.coins[0];
          return coin?.id;
        } catch (error) {
          this.logger.warn(`Failed to find CoinGecko ID for ${token.symbol}`);
          return null;
        }
      });

      const tokenIds = (await Promise.all(coinPromises))
        .filter(id => id) // Remove nulls
        .join(',');

      if (!tokenIds) {
        throw new Error('No matching tokens found for rate conversion');
      }

      // Get rates for our tokens
      const response = await axios.get(
        `${this.coingeckoApiUrl}/simple/price`,
        {
          params: {
            ids: tokenIds,
            vs_currencies: currency,
          }
        }
      );

      const rates = response.data;
      
      // Calculate average rate
      const rateValues = Object.values(rates).map((curr: any) => curr[currency] as number);
      const avgRate = rateValues.reduce((acc, curr) => acc + curr, 0) / rateValues.length;

      const rate = this.exchangeRateRepository.create({
        currency,
        rate: avgRate,
      });

      this.logger.log(`Updated exchange rate for ${currency}: ${avgRate}`);
      return this.exchangeRateRepository.save(rate);

    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate for ${currency}:`, error);
      
      // Return last known rate if available, otherwise throw
      const lastRate = await this.exchangeRateRepository.findOne({
        where: { currency }
      });
      
      if (lastRate) {
        this.logger.warn(`Using last known rate for ${currency} from ${lastRate.lastUpdated}`);
        return lastRate;
      }
      
      throw new Error(`Failed to get exchange rate for ${currency}`);
    }
  }

  async updateAllRates(): Promise<void> {
    const currencies = await this.currencyRepository.find();
    for (const currency of currencies) {
      await this.fetchAndSaveRate(currency.code.toLowerCase());
    }
  }
} 