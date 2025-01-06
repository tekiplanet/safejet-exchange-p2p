import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { User } from './entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Request } from 'express';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Throttle({ default: { limit: 5, ttl: 300 } })
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Throttle({ default: { limit: 5, ttl: 300 } })
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('2fa/generate')
  @UseGuards(JwtAuthGuard)
  generate2FASecret(@GetUser() user: User) {
    return this.authService.generate2FASecret(user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2FA(
    @GetUser() user: User,
    @Body() enable2FADto: Enable2FADto,
  ) {
    return this.authService.enable2FA(user.id, enable2FADto);
  }

  @Post('verify-2fa')
  async verify2FA(
    @Body() verify2FADto: Verify2FADto,
    @Req() req: Request,
  ) {
    return this.authService.verify2FA(verify2FADto, req);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2FA(
    @GetUser() user: User,
    @Body() disable2FADto: Disable2FADto,
  ) {
    return this.authService.disable2FA(
      user.id, 
      disable2FADto.code,
      disable2FADto.codeType
    );
  }

  @Get('2fa/backup-codes')
  @UseGuards(JwtAuthGuard)
  getBackupCodes(@GetUser() user: User) {
    return this.authService.getBackupCodes(user.id);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 300 } })
  resendVerificationCode(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerificationCode(resendVerificationDto.email);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@GetUser() user: User) {
    // Blacklist the token
    return this.authService.logout(user.id);
  }
} 