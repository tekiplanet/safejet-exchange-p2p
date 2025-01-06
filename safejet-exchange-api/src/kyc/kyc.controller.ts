import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KYCService } from './kyc.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  @Get('details')
  async getUserKYCDetails(@GetUser() user: User) {
    return this.kycService.getUserKYCDetails(user.id);
  }

  @Get('levels')
  async getAllKYCLevels() {
    return this.kycService.getAllKYCLevels();
  }
} 