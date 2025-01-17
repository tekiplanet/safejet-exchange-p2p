import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { ExchangeService } from './exchange.service';
import { Controller, Post } from '@nestjs/common';

@Controller('prices')
@Injectable()
export class PriceUpdateService {
  private readonly logger = new Logger(PriceUpdateService.name);
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_DELAY = 1000; // 1 second

  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private exchangeService: ExchangeService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async updatePrices() {
    try {
      const tokens = await this.tokenRepository.find({ 
        where: { isActive: true },
        order: { lastPriceUpdate: 'ASC' }
      });

      const batchSize = 3;
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (token) => {
            try {
              const priceData = await this.getPriceWithRetry(token);
              
              if (priceData.price > 0) {
                const currentPrice = Number(priceData.price);
                const oldPrice = Number(token.currentPrice);
                const price24h = Number(token.price24h || oldPrice);

                // Only update price24h if it's not set or if 24 hours have passed
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const shouldUpdatePrice24h = !token.lastPriceUpdate || 
                  token.lastPriceUpdate < twentyFourHoursAgo;

                // Calculate change percentage
                const changePercent = ((currentPrice - price24h) / price24h) * 100;

                await this.tokenRepository.update(token.id, {
                  currentPrice,
                  price24h: shouldUpdatePrice24h ? oldPrice : price24h,
                  changePercent24h: changePercent,
                  lastPriceUpdate: new Date(),
                });

                this.logger.log(
                  `Updated price for ${token.symbol}: $${currentPrice} (${changePercent.toFixed(2)}%) ` +
                  `[24h: $${price24h}]`
                );
              }
            } catch (error) {
              this.logger.error(`Failed to update price for ${token.symbol}: ${error.message}`);
            }
          })
        );

        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      this.logger.error('Failed to update prices:', error);
    }
  }

  private async getPriceWithRetry(token: Token, attempt = 1): Promise<{
    price: number;
    change24h: number;
    changePercent24h: number;
  }> {
    try {
      const delay = this.INITIAL_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      const priceData = await this.exchangeService.getCryptoPriceChange(token.symbol);

      // If price is 0 and we haven't exceeded max retries, try again
      if (priceData.price === 0 && attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt} for ${token.symbol} due to zero price`);
        return this.getPriceWithRetry(token, attempt + 1);
      }

      // If still 0 after retries, use previous price and maintain change data
      if (priceData.price === 0 && token.currentPrice > 0) {
        this.logger.warn(`Using previous price for ${token.symbol}`);
        return {
          price: token.currentPrice,
          change24h: token.currentPrice - token.price24h,
          changePercent24h: token.changePercent24h,
        };
      }

      return priceData;
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt} for ${token.symbol} after error: ${error.message}`);
        return this.getPriceWithRetry(token, attempt + 1);
      }

      // If all retries failed, maintain previous data
      if (token.currentPrice > 0) {
        this.logger.warn(`Using previous price for ${token.symbol} after all retries failed`);
        return {
          price: token.currentPrice,
          change24h: token.currentPrice - token.price24h,
          changePercent24h: token.changePercent24h,
        };
      }

      throw error;
    }
  }

  @Post('update')
  async triggerPriceUpdate() {
    this.logger.log('Manually triggering price update...');
    await this.updatePrices();
    return { message: 'Price update completed' };
  }
} 