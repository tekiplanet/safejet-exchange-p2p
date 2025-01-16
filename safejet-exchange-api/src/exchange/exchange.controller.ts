import { Controller, Get, Param } from '@nestjs/common';
import { ExchangeService } from './exchange.service';

@Controller('exchange-rates')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get(':currency')
  async getRate(@Param('currency') currency: string) {
    return this.exchangeService.getRateForCurrency(currency);
  }
} 