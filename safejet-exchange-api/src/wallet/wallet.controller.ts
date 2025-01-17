import { Controller, Post, Get, Param, Body, UseGuards, Request, Query, HttpException, HttpStatus } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balances')
  async getBalances(
    @GetUser() user: User,
    @Query('type') type?: string,
    @Query('currency') currency: string = 'USD',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const balances = await this.walletService.getBalances(
        user.id, 
        type,
        { 
          page: page ? parseInt(page, 10) : 1, 
          limit: limit ? parseInt(limit, 10) : 20 
        }
      );
      return balances;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch wallet balances',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createWallet(
    @GetUser() user: User,
    @Body() createWalletDto: CreateWalletDto,
  ) {
    return this.walletService.createWallet(user.id, createWalletDto);
  }

  @Get()
  async getWallets(@GetUser() user: User) {
    return this.walletService.getWallets(user.id);
  }

  @Get(':id')
  async getWallet(
    @GetUser() user: User,
    @Param('id') walletId: string,
  ) {
    return this.walletService.getWallet(user.id, walletId);
  }

  @Post('test-create')
  async testCreateWallet(
    @GetUser() user: User,
    @Body() createWalletDto: CreateWalletDto,
  ) {
    try {
      const wallet = await this.walletService.createWallet(user.id, createWalletDto);
      return {
        success: true,
        wallet: {
          id: wallet.id,
          blockchain: wallet.blockchain,
          address: wallet.address,
          status: wallet.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
} 