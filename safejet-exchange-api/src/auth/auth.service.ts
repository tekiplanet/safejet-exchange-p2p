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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(registerDto: RegisterDto) {
    const { email, phone, password } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      phone,
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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(userId: string, verifyEmailDto: VerifyEmailDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      throw new BadRequestException('No verification code found');
    }

    if (new Date() > user.verificationCodeExpires) {
      throw new BadRequestException('Verification code expired');
    }

    const isCodeValid = await bcrypt.compare(
      verifyEmailDto.code,
      user.verificationCode,
    );

    if (!isCodeValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await this.userRepository.save(user);

    // Send welcome email after successful verification
    await this.emailService.sendWelcomeEmail(user.email, user.email.split('@')[0]);

    return { message: 'Email verified successfully' };
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
} 