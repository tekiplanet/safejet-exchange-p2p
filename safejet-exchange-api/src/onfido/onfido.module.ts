import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnfidoService } from './onfido.service';
import { OnfidoController } from './onfido.controller';
import { OnfidoWebhookController } from './onfido.webhook.controller';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KYCLevel]),
    EmailModule,
  ],
  providers: [OnfidoService],
  controllers: [OnfidoController, OnfidoWebhookController],
  exports: [OnfidoService],
})
export class OnfidoModule {} 