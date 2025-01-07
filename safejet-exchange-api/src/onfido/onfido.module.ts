import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnfidoController } from './onfido.controller';
import { OnfidoService } from './onfido.service';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KYCLevel]),
    EmailModule,
  ],
  controllers: [OnfidoController],
  providers: [OnfidoService],
  exports: [OnfidoService],
})
export class OnfidoModule {} 