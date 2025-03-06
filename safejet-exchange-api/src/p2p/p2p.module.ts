import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { P2PController } from './p2p.controller';
import { P2PService } from './p2p.service';
import { P2POffer } from './entities/p2p-offer.entity';
import { PaymentMethod } from '../payment-methods/entities/payment-method.entity';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { P2PTraderSettings } from '../p2p-settings/entities/p2p-trader-settings.entity';
import { WalletBalance } from '../wallet/entities/wallet-balance.entity';
import { Token } from '../wallet/entities/token.entity';
import { ExchangeRate } from '../exchange/exchange-rate.entity';
import { WalletModule } from '../wallet/wallet.module';
import { P2PSettingsModule } from '../p2p-settings/p2p-settings.module';
import { User } from '../auth/entities/user.entity';
import { Currency } from '../currencies/entities/currency.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      P2POffer,
      PaymentMethod,
      PaymentMethodType,
      P2PTraderSettings,
      WalletBalance,
      Token,
      ExchangeRate,
      User,
      Currency,
    ]),
    WalletModule,
    P2PSettingsModule,
  ],
  controllers: [P2PController],
  providers: [P2PService],
  exports: [P2PService],
})
export class P2PModule {} 