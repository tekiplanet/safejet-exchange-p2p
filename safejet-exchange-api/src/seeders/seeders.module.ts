import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodsSeederService } from './payment-methods.seeder.service';
import { PaymentMethod } from '../payment-methods/entities/payment-method.entity';
import { CurrencySeederService } from './currency.seeder.service';
import { Currency } from '../currencies/entities/currency.entity';
import { TokensSeederService } from './tokens.seeder.service';
import { Token } from '../wallet/entities/token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // PaymentMethod, 
      // Currency, 
      Token
    ]),
  ],
  providers: [
    // PaymentMethodsSeederService,
    // CurrencySeederService,
    TokensSeederService,
  ],
  exports: [
    // PaymentMethodsSeederService,
    // CurrencySeederService,
    TokensSeederService,
  ],
})
export class SeedersModule {}
