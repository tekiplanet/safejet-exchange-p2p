import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ExchangeRate } from './exchange-rate.entity';
import { Token } from '../wallet/entities/token.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { PriceUpdateService } from './price-update.service';
import { ExchangeRateController } from './exchange-rate.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeRate, Token, Currency]),
  ],
  controllers: [ExchangeController, PriceUpdateService, ExchangeRateController],
  providers: [
    ExchangeService,
    PriceUpdateService,
  ],
  exports: [ExchangeService],
})
export class ExchangeModule {} 