import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplatesService } from './email-templates.service';
import { LoginInfoDto } from '../auth/dto/login-info.dto';

@Injectable()
export class EmailService {
  private transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {
    // Log the SMTP config for debugging
    console.log('SMTP Config:', {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      user: this.configService.get<string>('SMTP_USER'),
    });

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD')
      },
      debug: true,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('SMTP server is ready');
      }
    });
  }

  async sendVerificationEmail(email: string, code: string) {
    try {
      await this.transporter.sendMail({
        from: '"SafeJet Exchange" <noreply@safejet.com>',
        to: email,
        subject: 'Verify Your Email - SafeJet Exchange',
        html: this.emailTemplatesService.verificationEmail(code),
      });
    } catch (error) {
      console.error('Email sending failed:', error);
    }
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
    try {
      const info = await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Reset Your Password - SafeJet Exchange',
        html: this.emailTemplatesService.passwordResetEmail(code),
      });
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Password reset email failed:', error);
      // Don't throw, just log the error
    }
  }

  async sendPasswordChangedEmail(email: string, userName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Password Changed Successfully - SafeJet Exchange',
        html: this.emailTemplatesService.passwordChangedEmail(userName),
      });
    } catch (error) {
      console.error('Password changed email error:', error);
    }
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

  async sendKYCLevelUpgradeEmail(email: string, userName: string, newLevel: number) {
    try {
      await this.transporter.sendMail({
        from: '"SafeJet Exchange" <noreply@safejet.com>',
        to: email,
        subject: `KYC Level ${newLevel} Achieved - SafeJet Exchange`,
        html: this.emailTemplatesService.kycLevelUpgradeEmail(userName, newLevel),
      });
    } catch (error) {
      console.error('KYC upgrade email failed:', error);
    }
  }

  async sendVerificationFailedEmail(email: string, fullName: string, reason: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Identity Verification Failed - SafeJet Exchange',
        html: this.emailTemplatesService.verificationFailedEmail(fullName, reason),
      });
    } catch (error) {
      console.error('Verification failed email error:', error);
    }
  }

  async sendVerificationSuccessEmail(email: string, fullName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Identity Verification Successful - SafeJet Exchange',
        html: this.emailTemplatesService.verificationSuccessEmail(fullName),
      });
    } catch (error) {
      console.error('Verification success email error:', error);
    }
  }

  async sendVerificationStatusEmail(
    email: string,
    fullName: string,
    status: 'completed' | 'failed',
    rejectLabels?: string[],
    level: 'identity' | 'advanced' = 'identity'
  ): Promise<void> {
    try {
      const subject = status === 'completed'
        ? `${level === 'advanced' ? 'Advanced' : 'Identity'} Verification Successful - SafeJet Exchange`
        : `${level === 'advanced' ? 'Advanced' : 'Identity'} Verification Failed - SafeJet Exchange`;

      const text = status === 'completed'
        ? `Congratulations ${fullName}! Your ${level === 'advanced' ? 'advanced' : 'identity'} verification has been successfully completed.`
        : `Hello ${fullName}, unfortunately your ${level === 'advanced' ? 'advanced' : 'identity'} verification was not successful. ${rejectLabels ? `Reason: ${rejectLabels.join(', ')}` : ''}`;

      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject,
        html: this.emailTemplatesService.verificationStatusEmail(status, text, fullName),
      });
    } catch (error) {
      console.error('Verification status email error:', error);
    }
  }
} 