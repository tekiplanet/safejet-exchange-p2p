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
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { Order } from './entities/order.entity';
import { EmailModule } from '../email/email.module';
import { PaymentMethodField } from '../payment-methods/entities/payment-method-field.entity';
import { Dispute } from './entities/dispute.entity';
import { P2POrderGateway } from './gateways/p2p-order.gateway';
import { JwtModule } from '@nestjs/jwt';

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
      KYCLevel,
      Order,
      PaymentMethodField,
      Dispute,
    ]),
    WalletModule,
    P2PSettingsModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [P2PController],
  providers: [P2PService, P2POrderGateway],
  exports: [P2PService],
})
export class P2PModule {} 