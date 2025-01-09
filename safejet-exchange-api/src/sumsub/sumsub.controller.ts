import { Controller, Post, UseGuards, Get, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SumsubService } from './sumsub.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { SumsubWebhookPayload } from './sumsub.interface';

@Controller('kyc')
export class SumsubController {
  constructor(private readonly sumsubService: SumsubService) {}

  @Post('access-token')
  @UseGuards(JwtAuthGuard)
  async generateAccessToken(@GetUser() user: User) {
    try {
      const token = await this.sumsubService.generateAccessToken(user.id);
      return { token };
    } catch (error) {
      console.error('Error generating access token:', error);
      throw error;
    }
  }

  @Post('webhook')
  async handleWebhook(@Headers('x-payload-digest') signature: string, @Body() payload: SumsubWebhookPayload) {
    // Verify webhook signature
    const isValid = await this.sumsubService.verifyWebhookSignature(signature, payload);
    if (!isValid) {
      throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
    }

    // Handle the webhook event
    await this.sumsubService.handleWebhookEvent(payload);
    return { success: true };
  }
} 