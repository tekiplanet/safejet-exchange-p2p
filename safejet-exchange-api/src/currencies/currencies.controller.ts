import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
@UseGuards(JwtAuthGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {
    console.log('CurrenciesController initialized');
  }

  @Get()
  findAll() {
    console.log('GET /currencies called');
    return this.currenciesService.findAll();
  }
} 