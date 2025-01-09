import { Controller, Get, UseGuards, Post, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KYCService } from './kyc.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { SumsubService } from '../sumsub/sumsub.service';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KYCController {
  constructor(private readonly kycService: KYCService, private readonly sumsubService: SumsubService) {}

  @Get('details')
  async getUserKYCDetails(@GetUser() user: User) {
    return this.kycService.getUserKYCDetails(user.id);
  }

  @Get('levels')
  async getAllKYCLevels() {
    return this.kycService.getAllKYCLevels();
  }

  @Post('advanced-verification')
  @UseGuards(JwtAuthGuard)
  async startAdvancedVerification(@Request() req): Promise<{ token: string }> {
    try {
      const token = await this.sumsubService.startAdvancedVerification(req.user.id);
      return { token };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to start advanced verification',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 