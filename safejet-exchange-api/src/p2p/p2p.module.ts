import { Module, forwardRef } from '@nestjs/common';
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
import { P2PChatMessage } from './entities/p2p-chat-message.entity';
import { P2PChatGateway } from './gateways/p2p-chat.gateway';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileService } from '../common/services/file.service';
import { P2PDispute } from './entities/p2p-dispute.entity';
import { P2PDisputeMessage } from './entities/p2p-dispute-message.entity';
import { P2PDisputeGateway } from './gateways/p2p-dispute.gateway';

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
      P2PChatMessage,
      P2PDispute,
      P2PDisputeMessage,
    ]),
    WalletModule,
    P2PSettingsModule,
    EmailModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [P2PController],
  providers: [
    P2PService,
    P2POrderGateway,
    P2PChatGateway,
    FileService,
    P2PDisputeGateway,
  ],
  exports: [P2PService],
})
export class P2PModule {} 