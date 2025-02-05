import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from './exchange-rate.entity';

@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
  ) {}

  @Get()
  async getExchangeRates() {
    return this.exchangeRateRepository.find({
      select: ['currency', 'rate'], // Only return necessary fields
      order: { currency: 'ASC' }, // Sort alphabetically
    });
  }
} 