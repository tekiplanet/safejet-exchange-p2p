import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { PaymentMethodField } from '../payment-methods/entities/payment-method-field.entity';
import { PaymentMethodsSeederService } from './payment-methods.seeder.service';
import { Currency } from '../currencies/entities/currency.entity';
import { CurrencySeederService } from './currency.seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // PaymentMethodType,
      // PaymentMethodField,
      Currency,
    ]),
  ],
  providers: [
    // PaymentMethodsSeederService,
    CurrencySeederService,
  ],
  exports: [
    // PaymentMethodsSeederService,
    CurrencySeederService,
  ],
})
export class SeedersModule {}
