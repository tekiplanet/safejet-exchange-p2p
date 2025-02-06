import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin } from './entities/admin.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminDepositController } from './admin-deposit.controller';
import { AdminGuard } from '../auth/admin.guard';
import { WalletModule } from '../wallet/wallet.module';
import { SystemSettings } from '../wallet/entities/system-settings.entity';
import { P2PTraderSettings } from '../p2p-settings/entities/p2p-trader-settings.entity';
import { AdminP2PTraderSettingsController } from './p2p-trader-settings.controller';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { AdminWalletController } from './admin-wallet.controller';
import { Token } from '../wallet/entities/token.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { AdminWalletManagementController } from './admin-wallet-management.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin, 
      SystemSettings, 
      P2PTraderSettings, 
      WalletBalance,
      Token,
      Wallet,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    WalletModule,
  ],
  providers: [AdminAuthService, AdminGuard],
  controllers: [
    AdminAuthController, 
    AdminDepositController,
    AdminP2PTraderSettingsController,
    AdminWalletController,
    AdminWalletManagementController,
  ],
  exports: [AdminAuthService, AdminGuard, JwtModule],
})
export class AdminModule {} 