import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HomeService } from './home.service';
import { MarketOverviewResponse } from './dto/market-overview.dto';
import { TrendingTokensResponse } from './dto/trending-tokens.dto';
import { NewsResponse } from './dto/news.dto';
import { MarketListResponse } from './dto/market-list.dto';

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
    return this.homeService.getPortfolioSummary(req.user.id, currency, timeframe);
  }

  @Get('market-overview')
  async getBitcoinMarketOverview(): Promise<MarketOverviewResponse> {
    return this.homeService.getBitcoinMarketOverview();
  }

  @Get('trending')
  async getTrendingTokens(): Promise<TrendingTokensResponse> {
    return this.homeService.getTrendingTokens();
  }

  @Get('news')
  async getRecentNews(): Promise<NewsResponse> {
    return this.homeService.getRecentNews();
  }

  @Get('market-tokens')
  async getMarketTokens() {
    return this.homeService.getMarketTokens();
  }
} 