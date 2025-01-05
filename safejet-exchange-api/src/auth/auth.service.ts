import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import * as crypto from 'crypto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { DisableCodeType } from './dto/disable-2fa.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginTrackerService } from './login-tracker.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly loginTrackerService: LoginTrackerService,
  ) {}

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(registerDto: RegisterDto) {
    const { email, phone, password, fullName, countryCode: rawCountryCode, countryName } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Parse phone number safely
    let phoneWithoutCode = phone;
    let formattedCountryCode = rawCountryCode;

    if (phone.startsWith('+') && formattedCountryCode) {
      try {
        // Remove the exact country code from the phone number
        phoneWithoutCode = phone.substring(formattedCountryCode.length); // This will remove +234 from +2348166700169
        
        // Remove any leading zeros
        while (phoneWithoutCode.startsWith('0')) {
          phoneWithoutCode = phoneWithoutCode.substring(1);
        }
      } catch (error) {
        console.error('Error parsing phone number:', error);
        throw new BadRequestException('Invalid phone number format');
      }
    }

    // Validate country code format
    if (formattedCountryCode && !formattedCountryCode.startsWith('+')) {
      formattedCountryCode = `+${formattedCountryCode}`;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with validated data
    const user = this.userRepository.create({
      email,
      phone,
      phoneWithoutCode,
      countryCode: formattedCountryCode || '', // Store with + prefix
      countryName: countryName || '', // Store country name
      fullName,
      passwordHash,
    });

    // Generate and save verification code
    const verificationCode = this.generateVerificationCode();
    user.verificationCode = await bcrypt.hash(verificationCode, 10);
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.userRepository.save(user);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationCode);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, req: Request): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in',
        userId: user.id
      });
    }

    // If 2FA is enabled, return a temporary token
    if (user.twoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { 
          sub: user.id, 
          email: user.email,
          temp: true 
        },
        { expiresIn: '5m' }, // Short-lived token for 2FA
      );

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        requires2FA: true,
        tempToken,
      };
    }

    // If 2FA is not enabled, send login notification immediately
    if (!user.twoFactorEnabled) {
      const loginInfo = this.loginTrackerService.getLoginInfo(req);
      await this.emailService.sendLoginNotificationEmail(user.email, loginInfo);
    }

    // If 2FA is not enabled, generate regular tokens
    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { userId, code } = verifyEmailDto;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const isCodeValid = await bcrypt.compare(
      code,
      user.verificationCode,
    );

    if (!isCodeValid) {
      throw new BadRequestException('Incorrect verification code. Please try again.');
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await this.userRepository.save(user);

    // Send welcome email after successful verification
    await this.emailService.sendWelcomeEmail(user.email, user.email.split('@')[0]);

    // Generate tokens for automatic login after verification
    const tokens = await this.generateTokens(user);

    return {
      message: 'Email verified successfully',
      ...tokens,
      user,
    };
  }

  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email },
        { expiresIn: process.env.JWT_EXPIRATION },
      ),
      this.jwtService.signAsync(
        { sub: user.id },
        { expiresIn: process.env.JWT_REFRESH_EXPIRATION },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return { message: 'If your email is registered, you will receive a password reset code.' };
    }

    // Generate and save reset code
    const resetCode = this.generateVerificationCode();
    user.passwordResetCode = await bcrypt.hash(resetCode, 10);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.userRepository.save(user);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, resetCode);

    return { message: 'If your email is registered, you will receive a password reset code.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, code, newPassword } = resetPasswordDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.passwordResetCode || !user.passwordResetExpires) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (new Date() > user.passwordResetExpires) {
      throw new BadRequestException('Reset code has expired');
    }

    const isCodeValid = await bcrypt.compare(code, user.passwordResetCode);
    if (!isCodeValid) {
      throw new BadRequestException('Invalid reset code');
    }

    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    // Send password changed confirmation email
    await this.emailService.sendPasswordChangedEmail(email);

    return { message: 'Password has been reset successfully' };
  }

  async generate2FASecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SafeJet Exchange (${user.email})`,
    });

    // Save secret temporarily
    user.twoFactorSecret = secret.base32;
    await this.userRepository.save(user);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async enable2FA(userId: string, enable2FADto: Enable2FADto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Please generate 2FA secret first');
    }

    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: enable2FADto.code,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    console.log('Generated backup codes:', backupCodes); // For debugging

    // Store backup codes as JSON string
    user.twoFactorBackupCodes = JSON.stringify(backupCodes);
    user.twoFactorEnabled = true;
    
    try {
      await this.userRepository.save(user);
      console.log('Saved user with backup codes:', user.twoFactorBackupCodes); // For debugging
    } catch (error) {
      console.error('Error saving user:', error);
      throw new BadRequestException('Failed to enable 2FA');
    }

    // Send email notification
    await this.emailService.send2FAEnabledEmail(user.email);

    return {
      message: '2FA enabled successfully',
      backupCodes,
    };
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 8; i++) {
      codes.push(crypto.randomBytes(4).toString('hex'));
    }
    return codes;
  }

  async verify2FA(verify2FADto: Verify2FADto, req: Request) {
    const { email, code } = verify2FADto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Generate full access tokens after successful 2FA
    const tokens = await this.generateTokens(user);

    // Send login notification after successful 2FA
    const loginInfo = this.loginTrackerService.getLoginInfo(req);
    await this.emailService.sendLoginNotificationEmail(user.email, loginInfo);

    return {
      message: '2FA verification successful',
      user,
      ...tokens,
    };
  }

  async disable2FA(userId: string, disable2FADto: Disable2FADto) {
    const { code, codeType } = disable2FADto;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    let isValid = false;

    if (codeType === DisableCodeType.AUTHENTICATOR) {
      // Verify authenticator code
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
      });
    } else {
      // Verify backup code
      try {
        const backupCodes = JSON.parse(user.twoFactorBackupCodes);
        const codeIndex = backupCodes.indexOf(code);
        
        if (codeIndex !== -1) {
          isValid = true;
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          user.twoFactorBackupCodes = JSON.stringify(backupCodes);
        }
      } catch (error) {
        throw new BadRequestException('Invalid backup code format');
      }
    }

    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    // Reset 2FA fields
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = null;
    await this.userRepository.save(user);

    // Send email notification
    await this.emailService.send2FADisabledEmail(user.email);

    return { message: '2FA has been disabled successfully' };
  }

  async getBackupCodes(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    if (!user.twoFactorBackupCodes) {
      throw new BadRequestException('No backup codes found. Please disable and re-enable 2FA to generate new backup codes.');
    }

    try {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      if (!Array.isArray(backupCodes) || backupCodes.length === 0) {
        throw new BadRequestException('Invalid backup codes format');
      }
      return { backupCodes };
    } catch (error) {
      throw new BadRequestException('Unable to retrieve backup codes. Please disable and re-enable 2FA to generate new backup codes.');
    }
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return { message: 'If your email is registered, you will receive a verification code.' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate and save new verification code
    const verificationCode = this.generateVerificationCode();
    user.verificationCode = await bcrypt.hash(verificationCode, 10);
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await this.userRepository.save(user);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationCode);

    return { message: 'If your email is registered, you will receive a verification code.' };
  }
} 