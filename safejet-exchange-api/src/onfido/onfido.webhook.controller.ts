import { Controller, Post, Headers, Body, UnauthorizedException } from '@nestjs/common';
import { OnfidoService } from './onfido.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks/onfido')
export class OnfidoWebhookController {
  constructor(
    private readonly onfidoService: OnfidoService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-sha2-signature') signature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    const webhookToken = this.configService.get<string>('ONFIDO_WEBHOOK_TOKEN');
    const calculatedSignature = crypto
      .createHmac('sha256', webhookToken)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== calculatedSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Handle different webhook events
    switch (payload.payload.resource_type) {
      case 'check':
        if (payload.payload.action === 'check.completed') {
          await this.onfidoService.handleCheckCompletion(payload.payload);
        }
        break;
      case 'report':
        if (payload.payload.action === 'report.completed') {
          await this.onfidoService.handleReportCompletion(payload.payload);
        }
        break;
    }

    return { status: 'success' };
  }
} 