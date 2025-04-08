import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { Token } from '../wallet/entities/token.entity';
import { News } from '../news/entities/news.entity';
import { WalletModule } from '../wallet/wallet.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { NewsModule } from '../news/news.module';
import { PlatformSettings } from '../platform/entities/platform-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token, News, PlatformSettings]),
    WalletModule,
    ExchangeModule,
    NewsModule,
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {} 