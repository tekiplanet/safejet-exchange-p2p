import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ExchangeScheduler } from './exchange.scheduler';
import { ExchangeRate } from './exchange-rate.entity';
import { Token } from '../wallet/entities/token.entity';
import { Currency } from '../currencies/entities/currency.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeRate, Token, Currency]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService, ExchangeScheduler],
  exports: [ExchangeService],
})
export class ExchangeModule {} 