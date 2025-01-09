import { Injectable } from '@nestjs/common';
import { baseTemplate } from './templates/base.template';
import { LoginInfoDto } from '../auth/dto/login-info.dto';

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

  passwordChangedEmail(isDark = true) {
    const content = `
      <h1>Password Changed Successfully 🔒</h1>
      <p>Your password has been successfully changed.</p>
      
      <p>If you did not make this change, please contact our support team immediately:</p>
      <ul style="list-style: none; padding: 0;">
        <li>📧 <a href="mailto:support@safejet.com" style="color: #ffc300;">support@safejet.com</a></li>
        <li>💬 <a href="#" style="color: #ffc300;">Live Chat Support</a></li>
      </ul>
      
      <p>Best regards,<br>The SafeJet Team</p>
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

  verificationFailedEmail(fullName: string, reason: string, isDark = true): string {
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

  verificationStatusEmail(status: string, text: string, fullName: string, isDark = true): string {
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
} 