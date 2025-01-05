import { Injectable } from '@nestjs/common';
import { baseTemplate } from './templates/base.template';

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
} 