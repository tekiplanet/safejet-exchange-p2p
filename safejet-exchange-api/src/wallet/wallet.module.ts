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
      AdminWallet
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
    WalletListener
  ],
  controllers: [
    WalletController,
    AdminDepositController,
    AdminTokenController,
    AdminWalletController
  ],
  exports: [WalletService, DepositTrackingService],
})
export class WalletModule {
  constructor() {
    console.log('WalletModule JWT_SECRET:', process.env.JWT_SECRET ? 'Present' : 'Missing');
  }
} 