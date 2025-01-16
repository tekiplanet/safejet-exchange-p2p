import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { KeyManagementService } from './key-management.service';
import { Wallet } from './entities/wallet.entity';
import { WalletKey } from './entities/wallet-key.entity';
import { Token } from './entities/token.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { WalletListener } from './wallet.listener';
import { ExchangeModule } from '../exchange/exchange.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet, 
      WalletKey, 
      Token,
      WalletBalance
    ]),
    EventEmitterModule.forRoot(),
    ConfigModule,
    forwardRef(() => AuthModule),
    ExchangeModule,
  ],
  providers: [
    WalletService, 
    KeyManagementService,
    WalletListener
  ],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {} 