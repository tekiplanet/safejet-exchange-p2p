import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExchangeService } from './exchange.service';

@Controller('exchange-rates')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get(':currency')
  async getRateForCurrency(@Param('currency') currency: string) {
    console.log(`Getting rate for currency: ${currency}`);
    const rate = await this.exchangeService.getRateForCurrency(currency);
    return {
      currency: rate.currency,
      rate: rate.rate,
      lastUpdated: rate.lastUpdated
    };
  }

  @Get('crypto/price')
  async getCryptoPrice(
    @Query('symbol') symbol: string,
    @Query('currency') currency: string = 'USD',
  ) {
    const price = await this.exchangeService.getCryptoPrice(symbol, currency);
    return { price };
  }

  @Get('crypto/convert')
  async convertCryptoToFiat(
    @Query('amount') amount: number,
    @Query('symbol') symbol: string,
    @Query('currency') currency: string = 'USD',
  ) {
    const price = await this.exchangeService.getCryptoPrice(symbol, currency);
    return {
      price,
      value: amount * price,
      currency
    };
  }
} 