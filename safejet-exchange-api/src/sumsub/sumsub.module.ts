import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SumsubService } from './sumsub.service';
import { SumsubController } from './sumsub.controller';
import { User } from '../auth/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EmailModule,
  ],
  providers: [SumsubService],
  controllers: [SumsubController],
  exports: [SumsubService],
})
export class SumsubModule {} 