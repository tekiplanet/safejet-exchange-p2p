import { Controller, Post, Get, Param, Body, UseGuards, Request, Query, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { AuthService } from '../auth/auth.service';
import { Withdrawal } from './entities/withdrawal.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAddressBookDto } from './dto/create-address-book.dto';
import { AddressBook } from './entities/address-book.entity';
import { TransferDto } from './dto/transfer.dto';
import { Transfer } from './entities/transfer.entity';
import { ConvertTokenDto } from './dto/convert-token.dto';
import { Logger } from '@nestjs/common';

@Controller('wallets')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  async getBalances(
    @GetUser('id') userId: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    const validType = type === 'spot' || type === 'funding' ? type as 'spot' | 'funding' : undefined;
    
    return this.walletService.getBalances(
      userId,
      validType,
      {
        page: page || 1,
        limit: limit || 20,
      }
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req,
    @Body() createWalletDto: CreateWalletDto
  ) {
    return this.walletService.create(req.user.id, createWalletDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallets(@GetUser() user: User) {
    return this.walletService.getWallets(user.id);
  }

  @Get('address-book')
  @UseGuards(JwtAuthGuard)
  async getAddressBook(@GetUser('id') userId: string): Promise<AddressBook[]> {
    console.log('Getting address book for user ID:', userId);
    return this.walletService.getAddressBook(userId);
  }

  @Post('address-book')
  @UseGuards(JwtAuthGuard)
  async createAddressBookEntry(
    @GetUser('id') userId: string,
    @Body() createAddressBookDto: CreateAddressBookDto,
  ): Promise<AddressBook> {
    return this.walletService.createAddressBookEntry(userId, createAddressBookDto);
  }

  @Post('address-book/check')
  @UseGuards(JwtAuthGuard)
  async checkAddressExists(
    @GetUser('id') userId: string,
    @Body() data: {
      address: string,
      blockchain: string,
      network: string,
    },
  ): Promise<{ exists: boolean }> {
    const exists = await this.walletService.checkAddressExists(
      userId, 
      data.address, 
      data.blockchain, 
      data.network
    );
    return { exists };
  }

  @Get('conversion-fee')
  @UseGuards(JwtAuthGuard)
  async getConversionFee(
    @GetUser() user: User,
    @Query('tokenId') tokenId: string,
    @Query('amount') amount: number,
  ) {
    const fee = await this.walletService.getConversionFee(tokenId, amount);
    return fee;
  }

  @Get('exchange-rate')
  @UseGuards(JwtAuthGuard)
  async getExchangeRate(
    @GetUser() user: User,
    @Query('fromTokenId') fromTokenId: string,
    @Query('toTokenId') toTokenId: string,
  ) {
    const rate = await this.walletService.getExchangeRate(fromTokenId, toTokenId);
    return { exchangeRate: rate };
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactionHistory(
    @GetUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: 'deposit' | 'withdrawal' | 'conversion' | 'transfer'
  ) {
    this.logger.debug(`Getting transaction history for user ${user.id}`);
    this.logger.debug(`Query params: page=${page}, limit=${limit}, type=${type || 'all'}`);
    
    try {
      const result = await this.walletService.getTransactionHistory(user.id, page, limit, type);
      this.logger.debug(`Found ${result.transactions.length} transactions`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting transaction history: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getWallet(
    @GetUser() user: User,
    @Param('id') walletId: string,
  ) {
    console.log('Getting wallet for user ID:', user.id, 'and wallet ID:', walletId);
    return this.walletService.getWallet(user.id, walletId);
  }

  @Post('test-create')
  @UseGuards(JwtAuthGuard)
  async testCreateWallet(
    @GetUser() user: User,
    @Body() createWalletDto: CreateWalletDto,
  ) {
    try {
      const wallet = await this.walletService.create(user.id, createWalletDto);
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

  @Post('token/:id/market-data')
  async updateTokenMarketData(
    @Param('id') tokenId: string,
    @Query('timeframe') timeframe?: string
  ) {
    return this.walletService.updateSingleTokenMarketData(tokenId, timeframe);
  }

  @Post('tokens/market-data')
  async updateAllTokensMarketData() {
    return this.walletService.updateTokenMarketData();
  }

  @Get('deposit-address/:tokenId')
  @UseGuards(JwtAuthGuard)
  async getDepositAddress(
    @GetUser() user: User,
    @Param('tokenId') tokenId: string,
    @Query('network') network?: string,
    @Query('blockchain') blockchain?: string,
    @Query('version') version?: string,
  ) {
    console.log('Getting deposit address for:', {
      userId: user.id,
      tokenId,
      network,
      blockchain,
      version
    });
    
    return this.walletService.getDepositAddress(
      user.id,
      tokenId,
      network || 'mainnet',
      blockchain || 'ethereum',
      version || 'NATIVE'
    );
  }

  @Get('tokens/available')
  @UseGuards(JwtAuthGuard)
  async getAvailableTokens() {
    return this.walletService.getAvailableTokens();
  }

  @Post('calculate-withdrawal-fee')
  @UseGuards(JwtAuthGuard)
  async calculateWithdrawalFee(
    @GetUser('id') userId: string,
    @Body() data: {
      tokenId: string;
      amount: number;
      networkVersion: string;
      network: string;
    },
  ): Promise<{
    feeAmount: string;
    feeUSD: string;
    receiveAmount: string;
  }> {
    return this.walletService.calculateWithdrawalFee(
      data.tokenId,
      data.amount,
      data.networkVersion,
      data.network,
      userId,
    );
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async createWithdrawal(
    @GetUser() jwtUser: any,
    @Body() withdrawalDto: CreateWithdrawalDto,
    @Body('password') password?: string,
    @Body('twoFactorCode') twoFactorCode?: string,
  ): Promise<Withdrawal> {
    // Get user directly from repository to include all fields
    const user = await this.userRepository.findOne({
      where: { id: jwtUser.id }
    });

    console.log('Withdrawal request from user:', {
      userId: user.id,
      email: user.email,
      biometricEnabled: user.biometricEnabled,
      twoFactorEnabled: user.twoFactorEnabled
    });

    // For biometric users, skip password verification
    if (user.biometricEnabled === true) {
      console.log('Biometric user, skipping password verification');
    } else {
      console.log('Non-biometric user, requiring password');
      if (!password) {
        throw new UnauthorizedException('Password required');
      }
      const isPasswordValid = await this.authService.verifyPassword(password, user);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    // Only verify 2FA if user has it enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new UnauthorizedException('2FA code required');
      }
      await this.authService.verify2FAAction(twoFactorCode, user);
    }

    // Process withdrawal
    return this.walletService.createWithdrawal(user.id, withdrawalDto);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  async transferBalance(
    @Request() req,
    @Body() transferDto: TransferDto,
  ): Promise<Transfer> {
    return this.walletService.transferBalance(req.user.id, transferDto);
  }

  @Get('transfers')
  @UseGuards(JwtAuthGuard)
  async getTransferHistory(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{ transfers: Transfer[]; total: number }> {
    return this.walletService.getTransferHistory(req.user.id, page, limit);
  }

  @Post('convert')
  @UseGuards(JwtAuthGuard)
  async convertToken(
    @GetUser('id') userId: string,
    @Body() convertTokenDto: ConvertTokenDto,
  ) {
    return this.walletService.convertToken(userId, convertTokenDto);
  }
} 