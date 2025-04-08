import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { Token } from '../wallet/entities/token.entity';
import { WalletModule } from '../wallet/wallet.module';
import { ExchangeModule } from '../exchange/exchange.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    WalletModule,
    ExchangeModule,
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {} 