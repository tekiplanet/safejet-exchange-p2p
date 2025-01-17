import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { ExchangeService } from './exchange.service';

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

  @Cron(CronExpression.EVERY_30_SECONDS)
  async updatePrices() {
    try {
      const tokens = await this.tokenRepository.find({ 
        where: { isActive: true },
        order: { lastPriceUpdate: 'ASC' } // Update oldest prices first
      });

      const batchSize = 3; // Reduced batch size
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (token) => {
            try {
              // Try to get price with retries
              const priceData = await this.getPriceWithRetry(token);
              
              if (priceData.price > 0) {
                await this.tokenRepository.update(token.id, {
                  currentPrice: priceData.price,
                  price24h: priceData.price / (1 + (priceData.changePercent24h / 100)),
                  changePercent24h: priceData.changePercent24h,
                  lastPriceUpdate: new Date(),
                });
                this.logger.log(`Updated price for ${token.symbol}: $${priceData.price}`);
              } else {
                this.logger.warn(`Skipping update for ${token.symbol} due to zero price`);
              }
            } catch (error) {
              this.logger.error(`Failed to update price for ${token.symbol}: ${error.message}`);
            }
          })
        );

        // Add longer delay between batches (2 seconds)
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
      // Add delay based on attempt number (exponential backoff)
      const delay = this.INITIAL_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      const priceData = await this.exchangeService.getCryptoPriceChange(token.symbol);

      // If price is 0 and we haven't exceeded max retries, try again
      if (priceData.price === 0 && attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt} for ${token.symbol} due to zero price`);
        return this.getPriceWithRetry(token, attempt + 1);
      }

      // If still 0 after retries, use previous price if available
      if (priceData.price === 0 && token.currentPrice > 0) {
        this.logger.warn(`Using previous price for ${token.symbol}`);
        return {
          price: token.currentPrice,
          change24h: 0,
          changePercent24h: 0,
        };
      }

      return priceData;
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        this.logger.warn(`Retry ${attempt} for ${token.symbol} after error: ${error.message}`);
        return this.getPriceWithRetry(token, attempt + 1);
      }

      // If all retries failed, use previous price if available
      if (token.currentPrice > 0) {
        this.logger.warn(`Using previous price for ${token.symbol} after all retries failed`);
        return {
          price: token.currentPrice,
          change24h: 0,
          changePercent24h: 0,
        };
      }

      throw error;
    }
  }
} 