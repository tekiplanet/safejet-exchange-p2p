import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SumsubService } from './sumsub.service';
import { SumsubController } from './sumsub.controller';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';
import { EmailModule } from '../email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KYCLevel]),
    EmailModule,
    ConfigModule,
  ],
  providers: [SumsubService],
  controllers: [SumsubController],
  exports: [SumsubService],
})
export class SumsubModule {} 