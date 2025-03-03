import { Controller, Get, Query, UseGuards, Post, Body } from '@nestjs/common';
import { P2PService } from './p2p.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { CreateOfferDto } from './dto/create-offer.dto';

@Controller('p2p')
export class P2PController {
  constructor(private readonly p2pService: P2PService) {
    console.log('P2P Controller initialized');
  }

  @Get('available-assets')
  @UseGuards(JwtAuthGuard)
  async getAvailableAssets(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell'
  ) {
    return this.p2pService.getAvailableAssets(userId, type === 'buy');
  }

  @Get('trader-settings')
  @UseGuards(JwtAuthGuard)
  async getTraderSettings(@GetUser('id') userId: string) {
    console.log('Trader settings endpoint hit', { userId });
    return this.p2pService.getTraderSettings(userId);
  }

  @Get('market-price')
  async getMarketPrice(
    @Query('symbol') symbol: string,
    @Query('currency') currency: string,
  ) {
    return this.p2pService.getMarketPrice(symbol, currency);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell'
  ) {
    try {
      console.log('Getting payment methods for user:', userId, 'type:', type);
      const result = await this.p2pService.getPaymentMethods(userId, type === 'buy');
      console.log('Payment methods result:', result);
      return result;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  @Post('offers')
  @UseGuards(JwtAuthGuard)
  async createOffer(
    @GetUser('id') userId: string,
    @Body() createOfferDto: CreateOfferDto
  ) {
    return this.p2pService.createOffer(userId, createOfferDto);
  }
} 