import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '../wallet/entities/token.entity';
import { TokenManagementController } from './token-management.controller';
import { TokenManagementService } from './token-management.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    AdminModule,
  ],
  controllers: [TokenManagementController],
  providers: [TokenManagementService],
  exports: [TokenManagementService],
})
export class TokenManagementModule {} 