import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { P2PService } from './p2p.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('p2p')
export class P2PController {
  constructor(private readonly p2pService: P2PService) {}

  @Get('available-assets')
  @UseGuards(JwtAuthGuard)
  async getAvailableAssets(
    @GetUser('id') userId: string,
    @Query('type') type: 'buy' | 'sell'
  ) {
    return this.p2pService.getAvailableAssets(userId, type === 'buy');
  }
} 