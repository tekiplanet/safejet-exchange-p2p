import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KYCService } from './kyc.service';
import { KYCController } from './kyc.controller';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { SumsubService } from '../sumsub/sumsub.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email/email-templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, KYCLevel]), ConfigModule],
  providers: [KYCService, SumsubService, EmailService, EmailTemplatesService],
  controllers: [KYCController],
  exports: [KYCService],
})
export class KYCModule {}
