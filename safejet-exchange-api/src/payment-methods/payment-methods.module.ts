import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodType } from './entities/payment-method-type.entity';
import { PaymentMethodField } from './entities/payment-method-field.entity';
import { FileService } from '../common/services/file.service';
import { EmailModule } from '../email/email.module';
import { User } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod,
      PaymentMethodType,
      PaymentMethodField,
      User,
    ]),
    EmailModule,
    AuthModule,
  ],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService, FileService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
