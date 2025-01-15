import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async findAll() {
    try {
      console.log('Finding all currencies...');
      const currencies = await this.currencyRepository.find({
        where: { isActive: true },
        order: { code: 'ASC' },
      });
      console.log('Found currencies:', currencies);
      return currencies;
    } catch (error) {
      console.error('Error finding currencies:', error);
      throw error;
    }
  }

  async isValidCurrency(code: string): Promise<boolean> {
    const count = await this.currencyRepository.count({
      where: { code, isActive: true },
    });
    return count > 0;
  }
} 