import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    this.client = twilio(accountSid, authToken);
  }

  async sendVerificationCode(phoneNumber: string): Promise<string> {
    try {
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      await this.client.messages.create({
        body: `Your NadiaPoint verification code is: ${verificationCode}`,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to: phoneNumber,
      });

      return verificationCode;
    } catch (error) {
      console.error('Twilio error:', error);
      throw new Error('Failed to send verification code');
    }
  }
}
