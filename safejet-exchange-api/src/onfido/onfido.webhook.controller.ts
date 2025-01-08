import { Controller, Post, Headers, Body, HttpException, HttpStatus } from '@nestjs/common';
import { OnfidoService } from './onfido.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks/onfido')
export class OnfidoWebhookController {
  constructor(
    private readonly onfidoService: OnfidoService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-sha2-signature') signature: string,
    @Body() payload: any
  ) {
    try {
      // Verify webhook signature
      const webhookToken = this.configService.get<string>('ONFIDO_WEBHOOK_TOKEN');
      const calculatedSignature = crypto
        .createHmac('sha256', webhookToken)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== calculatedSignature) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      // Handle different webhook events
      switch (payload.resource_type) {
        case 'check':
          await this.onfidoService.handleCheckCompletion(payload);
          break;
        case 'report':
          await this.onfidoService.handleReportCompletion(payload);
          break;
      }

      return { status: 'success' };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 