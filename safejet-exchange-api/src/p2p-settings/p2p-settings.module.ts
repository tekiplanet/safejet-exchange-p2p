import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { P2PTraderSettings } from './entities/p2p-trader-settings.entity';
import { P2PSettingsController } from './p2p-settings.controller';
import { P2PSettingsService } from './p2p-settings.service';
import { CurrenciesModule } from '../currencies/currencies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([P2PTraderSettings]),
    CurrenciesModule,
  ],
  controllers: [P2PSettingsController],
  providers: [P2PSettingsService],
  exports: [P2PSettingsService],
})
export class P2PSettingsModule {} 