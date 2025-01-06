import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KYCService } from './kyc.service';
import { KYCController } from './kyc.controller';
import { User } from '../auth/entities/user.entity';
import { KYCLevel } from '../auth/entities/kyc-level.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, KYCLevel])],
  providers: [KYCService],
  controllers: [KYCController],
  exports: [KYCService],
})
export class KYCModule {} 