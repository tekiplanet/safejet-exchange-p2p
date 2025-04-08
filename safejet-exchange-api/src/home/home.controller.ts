import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('portfolio-summary')
  @UseGuards(JwtAuthGuard)
  async getPortfolioSummary(
    @Request() req,
    @Query('currency') currency: string = 'USD',
    @Query('timeframe') timeframe: string = '24h',
  ) {
    return this.homeService.getPortfolioSummary(req.user.userId, currency, timeframe);
  }
} 