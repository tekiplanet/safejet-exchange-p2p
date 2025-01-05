import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplatesService } from './email-templates.service';
import { LoginInfoDto } from '../auth/dto/login-info.dto';

@Injectable()
export class EmailService {
  private transporter;

  constructor(
    private configService: ConfigService,
    private emailTemplatesService: EmailTemplatesService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('SMTP_HOST'),
      port: configService.get('SMTP_PORT'),
      auth: {
        user: configService.get('SMTP_USER'),
        pass: configService.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'Verify Your Email - SafeJet Exchange',
      html: this.emailTemplatesService.verificationEmail(code),
    });
  }

  async sendWelcomeEmail(email: string, userName: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'Welcome to SafeJet Exchange - Start Your Trading Journey!',
      html: this.emailTemplatesService.welcomeEmail(userName),
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'Reset Your Password - SafeJet Exchange',
      html: this.emailTemplatesService.passwordResetEmail(code),
    });
  }

  async sendPasswordChangedEmail(email: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'Password Changed Successfully - SafeJet Exchange',
      html: this.emailTemplatesService.passwordChangedEmail(),
    });
  }

  async send2FAEnabledEmail(email: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: '2FA Enabled - SafeJet Exchange',
      html: this.emailTemplatesService.twoFactorEnabledEmail(),
    });
  }

  async send2FADisabledEmail(email: string) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: '2FA Disabled - SafeJet Exchange Security Alert',
      html: this.emailTemplatesService.twoFactorDisabledEmail(),
    });
  }

  async sendLoginNotificationEmail(email: string, loginInfo: LoginInfoDto) {
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'New Login Detected - SafeJet Exchange',
      html: this.emailTemplatesService.loginNotificationEmail(loginInfo),
    });
  }
} 