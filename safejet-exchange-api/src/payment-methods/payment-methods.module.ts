import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodType } from './entities/payment-method-type.entity';
import { PaymentMethodField } from './entities/payment-method-field.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentMethodType,
      PaymentMethodField,
    ]),
  ],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {} 