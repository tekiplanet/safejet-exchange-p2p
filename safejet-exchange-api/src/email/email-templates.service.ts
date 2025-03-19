import { Injectable } from '@nestjs/common';
import { baseTemplate } from './templates/base.template';
import { LoginInfoDto } from '../auth/dto/login-info.dto';
import { format } from 'date-fns';

@Injectable()
export class EmailTemplatesService {
  verificationEmail(code: string, isDark = true) {
    const content = `
      <h1>Welcome to SafeJet Exchange! 🚀</h1>
      <p>Thank you for joining SafeJet Exchange. To complete your registration, please use the verification code below:</p>
      
      <div class="code-block">
        ${code}
      </div>
      
      <p>This code will expire in <span class="highlight">15 minutes</span>.</p>
      
      <p>If you didn't create an account with SafeJet Exchange, you can safely ignore this email.</p>
      
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  passwordResetEmail(code: string, isDark = true) {
    const content = `
      <h1>Reset Your Password 🔐</h1>
      <p>We received a request to reset your password. Use the code below to proceed:</p>
      
      <div class="code-block">
        ${code}
      </div>
      
      <p>This code will expire in <span class="highlight">15 minutes</span>.</p>
      
      <p>If you didn't request a password reset, please secure your account immediately.</p>
    `;

    return baseTemplate(content, isDark);
  }

  twoFactorAuthEmail(code: string, isDark = true) {
    const content = `
      <h1>Two-Factor Authentication 🔒</h1>
      <p>Use the following code to complete your login:</p>
      
      <div class="code-block">
        ${code}
      </div>
      
      <p>This code will expire in <span class="highlight">5 minutes</span>.</p>
      
      <p>If you didn't attempt to log in, please secure your account immediately.</p>
    `;

    return baseTemplate(content, isDark);
  }

  welcomeEmail(userName: string, isDark = true) {
    const content = `
      <h1>Welcome to SafeJet Exchange! 🎉</h1>
      <p>Congratulations on verifying your account! You're now part of a secure and innovative crypto trading platform.</p>

      <div style="margin: 30px 0;">
        <h2 style="color: #ffc300;">What's Next? 🚀</h2>
        
        <div style="margin: 20px 0;">
          <h3 style="color: ${isDark ? '#ffd60a' : '#003566'};">1. Complete Your Profile</h3>
          <p>➜ Set up 2FA for enhanced security</p>
          <p>➜ Complete KYC verification for higher limits</p>
          <p>➜ Add your preferred payment methods</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: ${isDark ? '#ffd60a' : '#003566'};">2. Explore Our Features</h3>
          <p>➜ Spot Trading with 100+ trading pairs</p>
          <p>➜ P2P Trading with multiple payment options</p>
          <p>➜ Real-time market data and analytics</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: ${isDark ? '#ffd60a' : '#003566'};">3. Get Trading Benefits</h3>
          <p>➜ Zero fees on your first trade</p>
          <p>➜ Earn rewards through our referral program</p>
          <p>➜ Access to exclusive trading events</p>
        </div>
      </div>

      <div style="margin: 30px 0;">
        <h2 style="color: #ffc300;">Need Help? 🤝</h2>
        <p>Our support team is available 24/7 to assist you:</p>
        <ul style="list-style: none; padding: 0;">
          <li>📚 <a href="#" style="color: #ffc300;">Documentation</a></li>
          <li>💬 <a href="#" style="color: #ffc300;">Live Chat Support</a></li>
          <li>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></li>
        </ul>
      </div>

      <div style="margin: 30px 0;">
        <h2 style="color: #ffc300;">Stay Connected 🌐</h2>
        <p>Join our community to get the latest updates and trading tips:</p>
        <div style="margin: 15px 0;">
          <a href="#" class="button">Join Our Community</a>
        </div>
      </div>

      <div style="margin-top: 40px;">
        <p>Happy Trading! 📈</p>
        <p>Best regards,<br>The SafeJet Team</p>
      </div>
    `;

    return baseTemplate(content, isDark);
  }

  passwordChangedEmail(userName: string, isDark = true): string {
    const content = `
      <h1>Password Changed Successfully 🔒</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>Your password has been successfully changed. If you did not make this change, please:</p>
        <ol style="margin: 20px 0;">
          <li>Change your password immediately</li>
          <li>Enable 2FA if not already enabled</li>
          <li>Contact our support team</li>
        </ol>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Security Tips 🛡️</h2>
        <ul style="list-style: none; padding: 0;">
          <li>✓ Use a unique password for each account</li>
          <li>✓ Enable 2FA for additional security</li>
          <li>✓ Never share your password with anyone</li>
          <li>✓ Regularly check your account activity</li>
        </ul>
      </div>

      <div style="margin: 20px 0;">
        <p>If you need any assistance, our support team is available 24/7.</p>
        <p>Best regards,<br>The SafeJet Team</p>
      </div>
    `;

    return baseTemplate(content, isDark);
  }

  twoFactorEnabledEmail(isDark = true) {
    const content = `
      <h1>Two-Factor Authentication Enabled 🔒</h1>
      <p>2FA has been successfully enabled on your account. Your account is now more secure!</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Important Security Tips</h2>
        <ul>
          <li>Keep your backup codes in a safe place</li>
          <li>Don't share your 2FA codes with anyone</li>
          <li>Set up a backup authenticator app if possible</li>
        </ul>
      </div>

      <p>If you didn't enable 2FA, please contact our support team immediately:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  twoFactorDisabledEmail(isDark = true) {
    const content = `
      <h1>Two-Factor Authentication Disabled ⚠️</h1>
      <p>2FA has been disabled on your account. Your account security is now reduced.</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Security Recommendations</h2>
        <ul>
          <li>Consider re-enabling 2FA for better security</li>
          <li>Make sure you have a strong password</li>
          <li>Monitor your account for suspicious activity</li>
        </ul>
      </div>

      <p>If you didn't disable 2FA, please contact our support team immediately:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  loginNotificationEmail(loginInfo: LoginInfoDto, isDark = true) {
    const content = `
      <h1>New Login Detected 🔔</h1>
      <p>We detected a new login to your SafeJet Exchange account.</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Login Details</h2>
        <ul>
          <li>Time: ${loginInfo.timestamp.toLocaleString()}</li>
          <li>Location: ${loginInfo.location.city || 'Unknown'}, ${loginInfo.location.country || 'Unknown'}</li>
          <li>Device: ${loginInfo.device.device || 'Unknown'}</li>
          <li>Browser: ${loginInfo.device.browser || 'Unknown'}</li>
          <li>Operating System: ${loginInfo.device.os || 'Unknown'}</li>
          <li>IP Address: ${loginInfo.ip}</li>
        </ul>
      </div>

      <p>If this wasn't you, please:</p>
      <ol>
        <li>Change your password immediately</li>
        <li>Enable 2FA if not already enabled</li>
        <li>Contact our support team</li>
      </ol>

      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  kycLevelUpgradeEmail(userName: string, newLevel: number, isDark = true) {
    const content = `
      <h1>KYC Level ${newLevel} Achieved! 🎉</h1>
      <p>Congratulations ${userName}! Your KYC level has been upgraded to Level ${newLevel}.</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">New Benefits 🌟</h2>
        ${this.getKYCLevelBenefits(newLevel)}
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Next Steps 🚀</h2>
        ${this.getNextStepsContent(newLevel)}
      </div>

      <p>Thank you for choosing SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  private getKYCLevelBenefits(level: number): string {
    const benefits = {
      1: `
        <ul>
          <li>Increased withdrawal limits</li>
          <li>Access to P2P trading</li>
          <li>Basic trading features</li>
        </ul>
      `,
      2: `
        <ul>
          <li>Higher withdrawal limits</li>
          <li>Advanced trading features</li>
          <li>Lower trading fees</li>
          <li>OTC trading access</li>
        </ul>
      `,
      3: `
        <ul>
          <li>Maximum withdrawal limits</li>
          <li>VIP trading features</li>
          <li>Lowest trading fees</li>
          <li>Priority support</li>
          <li>Exclusive market insights</li>
        </ul>
      `,
    };
    return benefits[level] || '';
  }

  private getNextStepsContent(level: number): string {
    const nextSteps = {
      1: `
        <p>To unlock more benefits, consider upgrading to Level 2:</p>
        <ul>
          <li>Submit a valid government ID</li>
          <li>Provide proof of address</li>
          <li>Complete facial verification</li>
        </ul>
      `,
      2: `
        <p>To reach our highest tier (Level 3), you'll need to:</p>
        <ul>
          <li>Complete advanced verification</li>
          <li>Provide additional documentation</li>
          <li>Pass enhanced due diligence</li>
        </ul>
      `,
      3: `
        <p>You've reached our highest KYC level! You now have access to all features and benefits.</p>
        <ul>
          <li>Explore our advanced trading features</li>
          <li>Join our VIP community</li>
          <li>Contact your dedicated account manager</li>
        </ul>
      `,
    };
    return nextSteps[level] || '';
  }

  verificationFailedEmail(
    fullName: string,
    reason: string,
    isDark = true,
  ): string {
    const content = `
      <h1>Identity Verification Failed ❌</h1>
      <p>Hello ${fullName},</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Issue Details ⚠️</h2>
        <p>${reason}</p>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Next Steps 🚀</h2>
        <ul>
          <li>Please ensure your documents are clear and valid</li>
          <li>Make sure photos are well-lit and not blurry</li>
          <li>Try the verification process again</li>
        </ul>
      </div>

      <p>If you need assistance, our support team is here to help!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  verificationSuccessEmail(fullName: string, isDark = true): string {
    const content = `
      <h1>Identity Verification Successful! 🎉</h1>
      <p>Congratulations ${fullName}!</p>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">What's Next 🌟</h2>
        <ul>
          <li>Access to all platform features</li>
          <li>Higher transaction limits</li>
          <li>Enhanced security features</li>
        </ul>
      </div>

      <p>Thank you for choosing SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  verificationStatusEmail(
    status: string,
    text: string,
    fullName: string,
    isDark = true,
  ): string {
    const content = `
      <h1>${status === 'completed' ? 'Verification Complete! 🎉' : 'Verification Update ⚠️'}</h1>
      <p>Hello ${fullName},</p>
      
      <div style="margin: 20px 0;">
        ${text}
      </div>

      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  paymentMethodAddedEmail(userName: string, methodName: string, isDark = true) {
    const content = `
      <h1>New Payment Method Added 💳</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>A new payment method has been added to your account:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${methodName}</h3>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Security Tips 🔒</h2>
        <ul>
          <li>Regularly review your payment methods</li>
          <li>Enable 2FA for enhanced security</li>
          <li>Never share your payment details</li>
        </ul>
      </div>

      <p>If you didn't add this payment method, please contact our support team immediately:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  paymentMethodUpdatedEmail(userName: string, methodName: string, isDark = true) {
    const content = `
      <h1>Payment Method Updated ✏️</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>Your payment method has been updated:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${methodName}</h3>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <p>If you didn't make this change, please:</p>
        <ol>
          <li>Review your payment methods immediately</li>
          <li>Change your password</li>
          <li>Contact our support team</li>
        </ol>
      </div>

      <p>Need help? Contact us:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  paymentMethodDeletedEmail(userName: string, methodName: string, isDark = true) {
    const content = `
      <h1>Payment Method Deleted 🗑️</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>A payment method has been removed from your account:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${methodName}</h3>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <p>If you didn't delete this payment method, please:</p>
        <ol>
          <li>Change your password immediately</li>
          <li>Enable 2FA if not already enabled</li>
          <li>Contact our support team</li>
        </ol>
      </div>

      <p>Need assistance? We're here to help:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  depositCreatedEmail(userName: string, amount: string, currency: string, isDark = true) {
    const content = `
      <h1>New Deposit Received 📥</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>A new deposit has been detected in your wallet:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${amount} ${currency}</h3>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <p>The deposit is currently pending confirmation. We'll notify you once it's confirmed and credited to your balance.</p>
      </div>

      <p>Need assistance? Contact our support team:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>
    `;

    return baseTemplate(content, isDark);
  }

  depositConfirmedEmail(userName: string, amount: string, currency: string, isDark = true) {
    const content = `
      <h1>Deposit Confirmed ✅</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>Your deposit has been confirmed and credited to your balance:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${amount} ${currency}</h3>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <p>You can now use these funds for trading or other services on SafeJet Exchange.</p>
      </div>

      <p>Happy trading!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  withdrawalNotificationEmail(userName: string, amount: string, currency: string, isDark = true) {
    const content = `
      <h1>Withdrawal Placed! 💸</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>Your withdrawal has been successfully placed:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${amount} ${currency}</h3>
        </div>
        <p>If you did not initiate this withdrawal, please contact our support team immediately.</p>
      </div>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  private compile(templateName: string, data: any): string {
    switch (templateName) {
      case 'transfer-confirmation':
        return this.transferConfirmationEmail(
          data.amount,
          data.token,
          data.fromType,
          data.toType,
          data.date,
        );
      default:
        throw new Error(`Template ${templateName} not found`);
    }
  }

  private transferConfirmationEmail(
    amount: string,
    token: string,
    fromType: string,
    toType: string,
    date: string,
    isDark = true,
  ): string {
    const content = `
      <h1>Transfer Confirmation ✅</h1>
      <p>Your transfer has been completed successfully:</p>
      
      <div style="margin: 20px 0;">
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${amount} ${token}</h3>
          <p style="margin: 5px 0;">From: ${fromType}</p>
          <p style="margin: 5px 0;">To: ${toType}</p>
          <p style="margin: 5px 0; font-size: 0.9em;">Date: ${date}</p>
        </div>
      </div>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  async getTransferConfirmationTemplate(data: {
    amount: string;
    token: string;
    fromType: string;
    toType: string;
    date: Date;
  }, isDark = true): Promise<string> {
    const content = `
      <h1>Transfer Confirmation ✅</h1>
      <p>Your transfer has been completed successfully:</p>
      
      <div style="margin: 20px 0;">
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">${data.amount} ${data.token}</h3>
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0;">From: <span style="color: #ffc300;">${data.fromType}</span></p>
            <p style="margin: 5px 0;">To: <span style="color: #ffc300;">${data.toType}</span></p>
            <p style="margin: 5px 0; font-size: 0.9em;">Date: ${format(data.date, 'PPpp')}</p>
          </div>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Security Tips 🛡️</h2>
        <ul style="list-style: none; padding: 0;">
          <li>✓ Always verify your transfer details</li>
          <li>✓ Enable 2FA for additional security</li>
          <li>✓ Monitor your account activity regularly</li>
        </ul>
      </div>

      <p>Need assistance? Contact our support team:</p>
      <p>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></p>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  async getConversionConfirmationTemplate(data: {
    fromAmount: string;
    fromToken: string;
    toAmount: string;
    toToken: string;
    fee: string;
    feeType: string;
    date: Date;
  }): Promise<string> {
    const isDark = true;
    const content = `
      <h1>Conversion Confirmation ✅</h1>
      <p>Your conversion has been completed successfully:</p>
      
      <div style="margin: 20px 0;">
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">
            ${data.fromAmount} ${data.fromToken} → ${data.toAmount} ${data.toToken}
          </h3>
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0;">Fee: ${data.fee} ${data.feeType === 'percentage' ? '%' : data.fromToken}</p>
            <p style="margin: 5px 0; font-size: 0.9em;">Date: ${format(data.date, 'PPpp')}</p>
          </div>
        </div>
      </div>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, true);
  }

  p2pOrderCreatedForBuyerEmail(
    userName: string, 
    trackingId: string, 
    amount: string, 
    currency: string, 
    tokenSymbol: string,
    paymentDeadline: Date,
    isDark = true
  ): string {
    const deadlineFormatted = paymentDeadline.toLocaleString();
    
    const content = `
      <h1>P2P Order Created - Buy ${tokenSymbol} 🔄</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>Your P2P buy order has been created successfully:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">Order #${trackingId}</h3>
          <p style="margin: 5px 0;">Amount: ${amount} ${tokenSymbol}</p>
          <p style="margin: 5px 0;">Total: ${currency}</p>
          <p style="margin: 5px 0; font-size: 0.9em; color: ${isDark ? '#ff9800' : '#e65100'};">
            Payment Deadline: ${deadlineFormatted}
          </p>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Next Steps 🚀</h2>
        <ol>
          <li>Make the payment using the seller's payment details</li>
          <li>Mark the order as "Paid" on the platform</li>
          <li>Wait for the seller to confirm receipt of payment</li>
        </ol>
        <p style="color: ${isDark ? '#ff9800' : '#e65100'}; font-weight: bold;">
          Important: You must complete payment before the deadline or the order may be cancelled.
        </p>
      </div>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }

  p2pOrderCreatedForSellerEmail(
    userName: string, 
    trackingId: string, 
    amount: string, 
    tokenSymbol: string,
    paymentDeadline: Date,
    isDark = true
  ): string {
    const deadlineFormatted = paymentDeadline.toLocaleString();
    
    const content = `
      <h1>P2P Order Created - Sell ${tokenSymbol} 🔄</h1>
      <p>Hello ${userName},</p>
      
      <div style="margin: 20px 0;">
        <p>A buyer has placed an order for your P2P offer:</p>
        <div style="background: ${isDark ? '#2a2a2a' : '#f5f5f5'}; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <h3 style="color: #ffc300; margin: 0;">Order #${trackingId}</h3>
          <p style="margin: 5px 0;">Amount: ${amount} ${tokenSymbol}</p>
          <p style="margin: 5px 0; font-size: 0.9em; color: ${isDark ? '#ff9800' : '#e65100'};">
            Payment Deadline: ${deadlineFormatted}
          </p>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #ffc300;">Next Steps 🚀</h2>
        <ol>
          <li>The buyer will make payment using your payment details</li>
          <li>Once the buyer marks the order as "Paid", check your payment account</li>
          <li>Confirm receipt of payment to release the ${tokenSymbol}</li>
        </ol>
        <p style="color: ${isDark ? '#ff9800' : '#e65100'}; font-weight: bold;">
          Important: The buyer must complete payment before the deadline.
        </p>
      </div>

      <p>Thank you for using SafeJet Exchange!</p>
      <p>Best regards,<br>The SafeJet Team</p>
    `;

    return baseTemplate(content, isDark);
  }
}
