import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '../currencies/entities/currency.entity';

@Injectable()
export class CurrencySeederService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  async seed(): Promise<void> {
    const currencies = [
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
    ];

    for (const currency of currencies) {
      const exists = await this.currencyRepository.findOne({
        where: { code: currency.code },
      });

      if (!exists) {
        await this.currencyRepository.save(
          this.currencyRepository.create(currency),
        );
      }
    }
  }
} 