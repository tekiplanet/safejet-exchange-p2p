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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { WalletListener } from './wallet.listener';
import { ExchangeModule } from '../exchange/exchange.module';
import { AdminDepositController } from './admin/deposit.controller';
import { JwtModule } from '@nestjs/jwt';
import { AdminTokenController } from './admin/token.controller';
import { EmailModule } from '../email/email.module';
import { User } from '../auth/entities/user.entity';
import { AdminWallet } from './entities/admin-wallet.entity';
import { AdminWalletController } from './admin/admin-wallet.controller';
import { AdminWalletService } from './services/admin-wallet.service';
import { SweepTransaction } from './entities/sweep-transaction.entity';
import { GasTankWallet } from './entities/gas-tank-wallet.entity';
import { GasTankWalletController } from './admin/gas-tank-wallet.controller';
import { GasTankWalletService } from './services/gas-tank-wallet.service';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { AddressBook } from './entities/address-book.entity';
import { Transfer } from './entities/transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet, 
      WalletKey, 
      Token,
      WalletBalance,
      Deposit,
      SystemSettings,
      User,
      AdminWallet,
      SweepTransaction,
      GasTankWallet,
      KYCLevel,
      Withdrawal,
      AddressBook,
      Transfer
    ]),
    EventEmitterModule.forRoot(),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION') },
      }),
    }),
    forwardRef(() => AuthModule),
    ExchangeModule,
    EmailModule
  ],
  providers: [
    WalletService, 
    KeyManagementService,
    DepositTrackingService,
    WalletListener,
    AdminWalletService,
    GasTankWalletService
  ],
  controllers: [
    WalletController,
    AdminDepositController,
    AdminTokenController,
    AdminWalletController,
    GasTankWalletController
  ],
  exports: [WalletService, DepositTrackingService, AdminWalletService, GasTankWalletService],
})
export class WalletModule {
  constructor() {
    console.log('WalletModule JWT_SECRET:', process.env.JWT_SECRET ? 'Present' : 'Missing');
  }
} 