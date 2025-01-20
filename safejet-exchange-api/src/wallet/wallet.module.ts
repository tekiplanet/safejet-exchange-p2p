import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { KeyManagementService } from './key-management.service';
import { DepositTrackingService } from './services/deposit-tracking.service';
import { Wallet } from './entities/wallet.entity';
import { WalletKey } from './entities/wallet-key.entity';
import { Token } from './entities/token.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { Deposit } from './entities/deposit.entity';
import { SystemSettings } from './entities/system-settings.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { WalletListener } from './wallet.listener';
import { ExchangeModule } from '../exchange/exchange.module';
import { AdminDepositController } from './admin/deposit.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet, 
      WalletKey, 
      Token,
      WalletBalance,
      Deposit,
      SystemSettings
    ]),
    EventEmitterModule.forRoot(),
    ConfigModule,
    JwtModule.register({}),
    forwardRef(() => AuthModule),
    ExchangeModule,
  ],
  providers: [
    WalletService, 
    KeyManagementService,
    DepositTrackingService,
    WalletListener
  ],
  controllers: [
    WalletController,
    AdminDepositController
  ],
  exports: [WalletService, DepositTrackingService],
})
export class WalletModule {} 