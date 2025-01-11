import {
  Controller,
  Post,
  UseGuards,
  Get,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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
  async handleWebhook(
    @Headers('x-payload-digest') signature: string,
    @Body() payload: SumsubWebhookPayload,
    @Req() request: Request & { rawBody: string },
  ) {
    try {
      if (!signature) {
        console.error('Missing signature header');
        throw new HttpException('Missing signature', HttpStatus.BAD_REQUEST);
      }

      if (!request.rawBody) {
        console.error('Missing raw body');
        throw new HttpException('Missing raw body', HttpStatus.BAD_REQUEST);
      }

      console.log('Webhook request details:', {
        headers: request.headers,
        signatureHeader: signature,
        rawBodyExists: !!request.rawBody,
        rawBodyLength: request.rawBody?.length,
        payloadType: typeof payload,
      });

      const isValid = await this.sumsubService.verifyWebhookSignature(
        signature,
        payload,
        request.rawBody,
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        throw new HttpException(
          'Invalid webhook signature',
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.sumsubService.handleWebhookEvent(payload);
      return { success: true };
    } catch (error) {
      console.error('Webhook handler error:', error);
      throw error;
    }
  }
}
