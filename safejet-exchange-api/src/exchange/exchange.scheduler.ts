import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeService } from './exchange.service';

@Injectable()
export class ExchangeScheduler {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateRates() {
    await this.exchangeService.updateAllRates();
  }
} 