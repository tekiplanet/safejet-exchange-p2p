import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodType } from '../payment-methods/entities/payment-method-type.entity';
import { PaymentMethodField } from '../payment-methods/entities/payment-method-field.entity';
import { PaymentMethodsSeederService } from './payment-methods.seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethodType, PaymentMethodField])],
  providers: [PaymentMethodsSeederService],
  exports: [PaymentMethodsSeederService],
})
export class SeedersModule {}
