import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplatesService } from './email-templates.service';
import { LoginInfoDto } from '../auth/dto/login-info.dto';
import { Withdrawal } from '../wallet/entities/withdrawal.entity';

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
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      debug: true,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
      },
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

  async sendPasswordChangedEmail(
    email: string,
    userName: string,
  ): Promise<void> {
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

  async sendKYCLevelUpgradeEmail(
    email: string,
    userName: string,
    newLevel: number,
  ) {
    try {
      await this.transporter.sendMail({
        from: '"SafeJet Exchange" <noreply@safejet.com>',
        to: email,
        subject: `KYC Level ${newLevel} Achieved - SafeJet Exchange`,
        html: this.emailTemplatesService.kycLevelUpgradeEmail(
          userName,
          newLevel,
        ),
      });
    } catch (error) {
      console.error('KYC upgrade email failed:', error);
    }
  }

  async sendVerificationFailedEmail(
    email: string,
    fullName: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Identity Verification Failed - SafeJet Exchange',
        html: this.emailTemplatesService.verificationFailedEmail(
          fullName,
          reason,
        ),
      });
    } catch (error) {
      console.error('Verification failed email error:', error);
    }
  }

  async sendVerificationSuccessEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
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
    level: 'identity' | 'advanced' = 'identity',
  ): Promise<void> {
    try {
      const subject =
        status === 'completed'
          ? `${level === 'advanced' ? 'Advanced' : 'Identity'} Verification Successful - SafeJet Exchange`
          : `${level === 'advanced' ? 'Advanced' : 'Identity'} Verification Failed - SafeJet Exchange`;

      const text =
        status === 'completed'
          ? `Congratulations ${fullName}! Your ${level === 'advanced' ? 'advanced' : 'identity'} verification has been successfully completed.`
          : `Hello ${fullName}, unfortunately your ${level === 'advanced' ? 'advanced' : 'identity'} verification was not successful. ${rejectLabels ? `Reason: ${rejectLabels.join(', ')}` : ''}`;

      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject,
        html: this.emailTemplatesService.verificationStatusEmail(
          status,
          text,
          fullName,
        ),
      });
    } catch (error) {
      console.error('Verification status email error:', error);
    }
  }

  async sendPaymentMethodAddedEmail(email: string, userName: string, methodName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'New Payment Method Added - SafeJet Exchange',
        html: this.emailTemplatesService.paymentMethodAddedEmail(userName, methodName),
      });
    } catch (error) {
      console.error('Payment method added email error:', error);
    }
  }

  async sendPaymentMethodUpdatedEmail(email: string, userName: string, methodName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Payment Method Updated - SafeJet Exchange',
        html: this.emailTemplatesService.paymentMethodUpdatedEmail(userName, methodName),
      });
    } catch (error) {
      console.error('Payment method updated email error:', error);
    }
  }

  async sendPaymentMethodDeletedEmail(email: string, userName: string, methodName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Payment Method Deleted - SafeJet Exchange',
        html: this.emailTemplatesService.paymentMethodDeletedEmail(userName, methodName),
      });
    } catch (error) {
      console.error('Payment method deleted email error:', error);
    }
  }

  async sendDepositCreatedEmail(email: string, userName: string, amount: string, currency: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'New Deposit Received - SafeJet Exchange',
        html: this.emailTemplatesService.depositCreatedEmail(userName, amount, currency),
      });
    } catch (error) {
      console.error('Deposit created email error:', error);
    }
  }

  async sendDepositConfirmedEmail(email: string, userName: string, amount: string, currency: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: 'Deposit Confirmed - SafeJet Exchange',
        html: this.emailTemplatesService.depositConfirmedEmail(userName, amount, currency),
      });
    } catch (error) {
      console.error('Deposit confirmed email error:', error);
    }
  }

  async sendWithdrawalNotificationEmail(
    email: string, 
    userName: string,  // This remains unchanged
    withdrawal: Withdrawal
  ) {
    const amount = withdrawal.amount;
    const currency = withdrawal.metadata.token.symbol;  // Get symbol from metadata

    try {
      await this.transporter.sendMail({
        from: '"SafeJet Exchange" <noreply@safejet.com>',
        to: email,
        subject: 'Withdrawal Placed - SafeJet Exchange',
        html: this.emailTemplatesService.withdrawalNotificationEmail(userName, amount, currency),
      });
    } catch (error) {
      console.error('Withdrawal notification email error:', error);
    }
  }

  async sendTransferConfirmation(
    email: string,
    data: {
      amount: string;
      token: string;
      fromType: string;
      toType: string;
      date: Date;
    },
  ): Promise<void> {
    const template = await this.emailTemplatesService.getTransferConfirmationTemplate(data);
    
    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: email,
      subject: 'Transfer Confirmation',
      html: template,
    });
  }

  async sendConversionConfirmation(params: {
    to: string;
    data: {
      fromAmount: number;
      fromToken: string;
      toAmount: number;
      toToken: string;
      fee: number;
      feeType: string;
      date: Date;
    };
  }): Promise<void> {
    const template = await this.emailTemplatesService.getConversionConfirmationTemplate({
      fromAmount: params.data.fromAmount.toString(),
      fromToken: params.data.fromToken,
      toAmount: params.data.toAmount.toString(),
      toToken: params.data.toToken,
      fee: params.data.fee.toString(),
      feeType: params.data.feeType,
      date: params.data.date,
    });

    await this.transporter.sendMail({
      from: '"SafeJet Exchange" <noreply@safejet.com>',
      to: params.to,
      subject: 'Conversion Confirmation',
      html: template,
    });
  }

  async sendP2POrderCreatedBuyerEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    currency: string,
    tokenSymbol: string,
    paymentDeadline: Date
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Created - Buy ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pOrderCreatedBuyerEmail(
          userName,
          trackingId,
          amount,
          currency,
          tokenSymbol,
          paymentDeadline
        ),
      });
    } catch (error) {
      console.error('P2P order created buyer email error:', error);
    }
  }

  async sendP2POrderCreatedSellerEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    paymentDeadline: Date
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Created - Sell ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pOrderCreatedSellerEmail(
          userName,
          trackingId,
          amount,
          tokenSymbol,
          currency,
          paymentDeadline
        ),
      });
    } catch (error) {
      console.error('P2P order created seller email error:', error);
    }
  }

  async sendP2POrderReceivedBuyerEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    currency: string,
    tokenSymbol: string,
    paymentDeadline: Date
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Received - Buy ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pOrderReceivedBuyerEmail(
          userName,
          trackingId,
          amount,
          currency,
          tokenSymbol,
          paymentDeadline
        ),
      });
    } catch (error) {
      console.error('P2P order received buyer email error:', error);
    }
  }

  async sendP2POrderReceivedSellerEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    paymentDeadline: Date
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Received - Sell ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pOrderReceivedSellerEmail(
          userName,
          trackingId,
          amount,
          tokenSymbol,
          currency,
          paymentDeadline
        ),
      });
    } catch (error) {
      console.error('P2P order received seller email error:', error);
    }
  }

  async sendP2PNewMessageEmail(
    email: string,
    userName: string,
    trackingId: string,
    isSystemMessage: boolean = false
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `New Message in P2P Order ${trackingId} - SafeJet Exchange`,
        html: this.emailTemplatesService.p2pNewMessageEmail(
          userName,
          trackingId,
          isSystemMessage
        ),
      });
    } catch (error) {
      console.error('P2P new message email error:', error);
    }
  }

  async sendP2POrderPaidEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    confirmationDeadline: Date
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Marked as Paid - ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pOrderPaidEmail(
          userName,
          trackingId,
          amount,
          tokenSymbol,
          currency,
          confirmationDeadline
        ),
      });
    } catch (error) {
      console.error('P2P order paid email error:', error);
    }
  }

  async sendP2PDisputeCreatedUserEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    reasonType: string,
    reason: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `P2P Order Disputed - ${tokenSymbol}`,
        html: this.emailTemplatesService.p2pDisputeCreatedUserEmail(
          userName,
          trackingId,
          amount,
          tokenSymbol,
          currency,
          reasonType,
          reason
        ),
      });
    } catch (error) {
      console.error('P2P dispute created user email error:', error);
    }
  }

  async sendP2PDisputeCreatedAdminEmail(
    email: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    reasonType: string,
    reason: string,
    initiatorName: string,
    respondentName: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `New P2P Dispute - Order #${trackingId}`,
        html: this.emailTemplatesService.p2pDisputeCreatedAdminEmail(
          trackingId,
          amount,
          tokenSymbol,
          currency,
          reasonType,
          reason,
          initiatorName,
          respondentName
        ),
      });
    } catch (error) {
      console.error('P2P dispute created admin email error:', error);
    }
  }

  async sendP2PDisputeMessageNotification(
    params: {
      userEmail: string;
      userName: string;
      adminEmail: string;
      disputeId: string;
      trackingId: string;
      initiatorName: string;
      respondentName: string;
      senderName: string;
      isAdmin: boolean;
    }
  ): Promise<void> {
    try {
      // Send email to the user
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: params.userEmail,
        subject: `New Dispute Message - Order #${params.trackingId}`,
        html: this.emailTemplatesService.p2pDisputeMessageUserEmail(
          params.userName,
          params.disputeId,
          params.trackingId,
          params.senderName,
          params.isAdmin
        ),
      });

      // Send email to admin
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: params.adminEmail,
        subject: `New Dispute Message - Order #${params.trackingId}`,
        html: this.emailTemplatesService.p2pDisputeMessageAdminEmail(
          params.disputeId,
          params.trackingId,
          params.initiatorName,
          params.respondentName,
        ),
      });
    } catch (error) {
      console.error('P2P dispute message notification email error:', error);
    }
  }

  async sendP2PDisputeStatusUpdateEmail(
    email: string,
    userName: string,
    trackingId: string,
    amount: string,
    tokenSymbol: string,
    currency: string,
    newStatus: string,
    statusDetails: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"SafeJet Exchange" <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: `Dispute Status Update - ${newStatus}`,
        html: this.emailTemplatesService.p2pDisputeStatusUpdateEmail(
          userName,
          trackingId,
          amount,
          tokenSymbol,
          currency,
          newStatus,
          statusDetails
        ),
      });
    } catch (error) {
      console.error('P2P dispute status update email error:', error);
    }
  }
}
