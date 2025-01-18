import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
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
import { KYCLevel } from './entities/kyc-level.entity';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { TwilioService } from '../twilio/twilio.service';
import { UpdateIdentityDetailsDto } from './dto/update-identity-details.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import { P2PSettingsService } from '../p2p-settings/p2p-settings.service';
import { WalletService } from '../wallet/wallet.service';
import { BLOCKCHAIN_CONFIGS } from '../wallet/blockchain.config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateWalletEvent } from '../wallet/events/create-wallet.event';

@Injectable()
export class AuthService {
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KYCLevel)
    private readonly kycLevelRepository: Repository<KYCLevel>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly loginTrackerService: LoginTrackerService,
    private readonly twilioService: TwilioService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private readonly p2pSettingsService: P2PSettingsService,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(registerDto: RegisterDto) {
    const {
      email,
      phone,
      password,
      fullName,
      countryCode: rawCountryCode,
      countryName,
    } = registerDto;

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
        phoneWithoutCode = phone.substring(formattedCountryCode.length);

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
      countryCode: formattedCountryCode || '',
      countryName: countryName || '',
      fullName,
      passwordHash,
    });

    // Generate and save verification code
    const verificationCode = this.generateVerificationCode();
    user.verificationCode = await bcrypt.hash(verificationCode, 10);
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await this.userRepository.save(user);

    // Emit event for background wallet creation
    try {
      this.eventEmitter.emit(
        'create.wallet',
        new CreateWalletEvent(user.id)
      );
      
      console.log(`Triggered background wallet creation for user: ${user.id}`);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to trigger wallet creation:', error);
    }

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationCode);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create P2P trader settings for the new user
    await this.p2pSettingsService.getSettings(user.id);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, req: Request) {
    try {
      const { email, password } = loginDto;
      console.log('Login attempt for:', email);
      
      const user = await this.userRepository.findOne({ where: { email } });
      console.log('User found:', !!user);

      if (!user) {
        console.log('No user found with email:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log('Password validation result:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        console.log('2FA is enabled for user:', user.email);
        const tempToken = await this.jwtService.signAsync(
          { sub: user.id, email: user.email, temp: true },
          { expiresIn: '5m' },
        );
        return {
          requires2FA: true,
          tempToken,
        };
      }

      // Generate tokens for non-2FA users
      const tokens = await this.generateTokens(user);

      // Send login notification
      const loginInfo = this.loginTrackerService.getLoginInfo(req);
      await this.emailService.sendLoginNotificationEmail(user.email, loginInfo);

      return {
        ...tokens,
        user,
        requires2FA: false,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
      throw new BadRequestException('Invalid or expired verification code.');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    const isCodeValid = await bcrypt.compare(code, user.verificationCode);

    if (!isCodeValid) {
      throw new BadRequestException(
        'Incorrect verification code. Please try again.',
      );
    }

    // Get the level 0 KYC level
    const unverifiedKycLevel = await this.kycLevelRepository.findOne({
      where: { level: 0 },
    });

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    user.kycLevelDetails = unverifiedKycLevel; // Set the KYC level relationship
    await this.userRepository.save(user);

    // Send welcome email after successful verification
    await this.emailService.sendWelcomeEmail(
      user.email,
      user.email.split('@')[0],
    );

    // Generate tokens for automatic login after verification
    const tokens = await this.generateTokens(user);

    return {
      status: 'success',
      message: 'Email verified successfully',
      ...tokens,
      user,
    };
  }

  async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',  // Access token expires in 15 minutes
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '7d',   // Refresh token expires in 7 days
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        return {
          message:
            'If your email is registered, you will receive a password reset code.',
        };
      }

      // Generate and save reset code
      const resetCode = this.generateVerificationCode();
      console.log('Generated reset code:', resetCode); // Add this for debugging

      user.passwordResetCode = await bcrypt.hash(resetCode, 10);
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await this.userRepository.save(user);

      try {
        await this.emailService.sendPasswordResetEmail(email, resetCode);
        console.log('Reset email sent successfully'); // Add this for debugging
      } catch (error) {
        console.error('Failed to send password reset email:', error);
      }

      return {
        message:
          'If your email is registered, you will receive a password reset code.',
        // Always return code in development for testing
        code: resetCode, // Remove the condition
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new BadRequestException('Failed to process password reset request');
    }
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
    await this.emailService.sendPasswordChangedEmail(email, user.fullName);

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

  private encryptBackupCodes(codes: string[]): string {
    try {
      // Generate a 32-byte (256-bit) key from the environment variable
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(codes), 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      const result = {
        iv: iv.toString('hex'),
        data: encrypted.toString('hex'),
        tag: authTag.toString('hex'),
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt backup codes');
    }
  }

  private decryptBackupCodes(encryptedData: string): string[] {
    try {
      const { iv, data, tag } = JSON.parse(encryptedData);
      // Generate the same key for decryption
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(data, 'hex')),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt backup codes');
    }
  }

  async enable2FA(userId: string, enable2FADto: Enable2FADto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: enable2FADto.code,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Encrypt the backup codes
    const encryptedData = this.encryptBackupCodes(backupCodes);

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = encryptedData;

    await this.userRepository.save(user);

    // Test decryption to verify it worked
    const decryptedCodes = this.decryptBackupCodes(user.twoFactorBackupCodes);
    console.log('Decryption test:', {
      original: backupCodes,
      encrypted: encryptedData,
      decrypted: decryptedCodes,
    });

    // Send email notification for 2FA enablement
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

  async disable2FA(userId: string, code: string, codeType: DisableCodeType) {
    try {
      console.log('Starting 2FA disable process for user:', userId);

      // Fetch complete user data
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      console.log('Current 2FA status:', {
        enabled: user.twoFactorEnabled,
        hasSecret: !!user.twoFactorSecret,
        hasBackupCodes: !!user.twoFactorBackupCodes,
      });

      if (!user.twoFactorEnabled) {
        throw new BadRequestException('2FA is not enabled');
      }

      let isValid = false;

      if (codeType === DisableCodeType.AUTHENTICATOR) {
        if (!user.twoFactorSecret) {
          throw new BadRequestException('2FA is not properly configured');
        }
        // Verify authenticator code
        isValid = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: code,
          window: 1,
        });
        console.log('Authenticator code verification result:', isValid);
      } else if (codeType === DisableCodeType.BACKUP) {
        if (!user.twoFactorBackupCodes) {
          throw new BadRequestException('No backup codes available');
        }
        // Verify backup code
        const backupCodes = JSON.parse(user.twoFactorBackupCodes);
        isValid = backupCodes.includes(code);
        console.log('Backup code verification result:', isValid);
      }

      if (!isValid) {
        throw new UnauthorizedException(
          codeType === DisableCodeType.AUTHENTICATOR
            ? 'Invalid authenticator code'
            : 'Invalid backup code',
        );
      }

      console.log('Code verification successful, disabling 2FA...');

      // Disable 2FA and clear all related fields
      const updateResult = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
        })
        .where('id = :id', { id: userId })
        .execute();

      console.log('Database update result:', updateResult);

      // Verify the update
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
      });
      console.log('User status after update:', {
        enabled: updatedUser.twoFactorEnabled,
        hasSecret: !!updatedUser.twoFactorSecret,
        hasBackupCodes: !!updatedUser.twoFactorBackupCodes,
      });

      // Send email notification
      await this.emailService.send2FADisabledEmail(user.email);

      return { message: '2FA disabled successfully' };
    } catch (error) {
      console.error('Disable 2FA error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Unable to disable 2FA. Please try again later.',
      );
    }
  }

  async getBackupCodes(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    if (!user.twoFactorBackupCodes) {
      throw new BadRequestException('No backup codes found');
    }

    try {
      console.log('Retrieving backup codes for user:', userId);
      const decryptedCodes = this.decryptBackupCodes(user.twoFactorBackupCodes);
      console.log('Successfully decrypted backup codes');
      return { backupCodes: decryptedCodes };
    } catch (error) {
      console.error('Error retrieving backup codes:', error);
      throw new BadRequestException('Unable to retrieve backup codes');
    }
  }

  async resendVerificationCode(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return {
        message:
          'If your email is registered, you will receive a verification code.',
      };
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

    return {
      message:
        'If your email is registered, you will receive a verification code.',
    };
  }

  async logout(userId: string) {
    try {
      // Here we could:
      // 1. Add the current token to a blacklist
      // 2. Clear any refresh tokens for this user
      // 3. Log the logout event

      return {
        status: 'success',
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to logout');
    }
  }

  private sanitizeUser(user: User) {
    const {
      passwordHash,
      verificationCode,
      verificationCodeExpires,
      twoFactorSecret,
      twoFactorBackupCodes,
      passwordResetCode,
      passwordResetExpires,
      ...sanitizedUser
    } = user;
    return sanitizedUser;
  }

  async updatePhone(userId: string, updatePhoneDto: UpdatePhoneDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update user phone details
      user.phone = updatePhoneDto.phone;
      user.countryCode = updatePhoneDto.countryCode;
      user.countryName = updatePhoneDto.countryName;
      user.phoneWithoutCode = updatePhoneDto.phoneWithoutCode;
      user.phoneVerified = false; // Reset phone verification status

      await this.userRepository.save(user);

      return {
        message: 'Phone number updated successfully',
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update phone number');
    }
  }

  async sendPhoneVerification(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      const verificationCode = await this.twilioService.sendVerificationCode(
        user.phone,
      );

      // Hash and save the verification code
      user.verificationCode = await bcrypt.hash(verificationCode, 10);
      user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await this.userRepository.save(user);

      return { message: 'Verification code sent successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to send verification code',
      );
    }
  }

  async verifyPhone(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('No verification code found');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Verification code has expired');
    }

    const isCodeValid = await bcrypt.compare(code, user.verificationCode);
    if (!isCodeValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.phoneVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    // Update KYC level if this completes level 1
    if (user.emailVerified && user.phoneVerified && user.kycLevel < 1) {
      const level1 = await this.kycLevelRepository.findOne({
        where: { level: 1 },
      });
      if (level1) {
        user.kycLevel = 1;
        user.kycLevelDetails = level1;
        // Send KYC upgrade email
        await this.emailService.sendKYCLevelUpgradeEmail(
          user.email,
          user.fullName,
          1,
        );
      }
    }

    await this.userRepository.save(user);

    return {
      message: 'Phone number verified successfully',
      user: this.sanitizeUser(user),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRATION,
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async updateIdentityDetails(
    userId: string,
    details: UpdateIdentityDetailsDto,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.kycData = {
      ...user.kycData,
      identityDetails: {
        firstName: details.firstName,
        lastName: details.lastName,
        dateOfBirth: details.dateOfBirth,
        address: details.address,
        city: details.city,
        state: details.state,
        country: details.country,
        submittedAt: new Date(),
      },
    };

    return this.userRepository.save(user);
  }

  async verifyPassword(
    password: string,
    user: User,
  ): Promise<{ valid: boolean }> {
    try {
      console.log('=== Password Verification Debug ===');
      console.log('Initial user object:', JSON.stringify(user, null, 2));
      console.log('Password received:', password);

      if (!password) {
        throw new BadRequestException('Please enter your current password');
      }

      // Fetch complete user data from database
      const completeUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!completeUser) {
        throw new BadRequestException('User not found');
      }

      console.log(
        'Complete user data fetched:',
        JSON.stringify(completeUser, null, 2),
      );

      if (!completeUser.passwordHash) {
        console.log('Password hash is missing from complete user data');
        throw new InternalServerErrorException(
          'User password data is corrupted. Please contact support.',
        );
      }

      console.log('Password hash exists:', completeUser.passwordHash);
      const isValid = await bcrypt.compare(password, completeUser.passwordHash);
      console.log('Password verification result:', isValid);

      return { valid: isValid };
    } catch (error) {
      console.error('Password verification detailed error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Unable to verify password. Please try again later.',
      );
    }
  }

  async changePassword(
    changePasswordDto: ChangePasswordDto,
    user: User,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      if (!currentPassword) {
        throw new BadRequestException('Please enter your current password');
      }

      if (!newPassword) {
        throw new BadRequestException('Please enter a new password');
      }

      // Log password validation attempt (without showing the actual password)
      console.log('Password validation check:', {
        length: newPassword.length,
        hasUppercase: /[A-Z]/.test(newPassword),
        hasLowercase: /[a-z]/.test(newPassword),
        hasNumber: /\d/.test(newPassword),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(newPassword),
      });

      // Fetch complete user data from database
      const completeUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!completeUser) {
        throw new BadRequestException('User not found');
      }

      if (!completeUser.passwordHash) {
        throw new InternalServerErrorException(
          'User password data is corrupted. Please contact support.',
        );
      }

      // Verify current password using complete user data
      const isValid = await bcrypt.compare(
        currentPassword,
        completeUser.passwordHash,
      );
      if (!isValid) {
        throw new UnauthorizedException(
          'Current password is incorrect. Please try again.',
        );
      }

      if (currentPassword === newPassword) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }

      // Hash new password
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await this.userRepository.update(completeUser.id, { passwordHash });

      // Send email notification
      await this.emailService.sendPasswordChangedEmail(
        completeUser.email,
        completeUser.fullName,
      );
    } catch (error) {
      console.error('Change password error:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Unable to change password. Please try again later.',
      );
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['kycLevelDetails'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive data but include biometricEnabled
    const {
      passwordHash,
      passwordResetCode,
      passwordResetExpires,
      ...safeUser
    } = user;
    
    console.log('Returning user with biometric status:', safeUser.biometricEnabled);
    return safeUser;
  }

  async verify2FAAction(code: string, user: User): Promise<void> {
    try {
      // Fetch complete user data to get 2FA secret
      const completeUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!completeUser) {
        throw new NotFoundException('User not found');
      }

      if (!completeUser.twoFactorEnabled) {
        throw new BadRequestException('2FA is not enabled for this account');
      }

      if (!completeUser.twoFactorSecret) {
        throw new BadRequestException('2FA is not properly configured');
      }

      // Verify the code
      const isValid = speakeasy.totp.verify({
        secret: completeUser.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 1, // Allow 30 seconds window
      });

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('2FA action verification error:', error);
      throw new InternalServerErrorException(
        'Unable to verify 2FA code. Please try again later.',
      );
    }
  }

  async updateNotificationSettings(
    userId: string,
    settings: Record<string, Record<string, boolean>>,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.notificationSettings = settings;
    await this.userRepository.save(user);
    return user;
  }

  async updateLanguage(userId: string, language: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.language = language;
    await this.userRepository.save(user);
    return user;
  }

  async updateBiometric(userId: string, enabled: boolean) {
    console.log(`Updating biometric status for user ${userId} to ${enabled}`);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.biometricEnabled = enabled;
    const updatedUser = await this.userRepository.save(user);
    console.log('Updated user biometric status:', updatedUser.biometricEnabled);
    return updatedUser;
  }
}
