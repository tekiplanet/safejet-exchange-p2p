import { Controller, Post, Body, Get, UseGuards, Req, Put, BadRequestException } from '@nestjs/common';
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
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { TwilioService } from '../twilio/twilio.service';
import { UpdateIdentityDetailsDto } from './dto/update-identity-details.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableCodeType } from './enums/disable-code-type.enum';

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

  @Post('disable-2fa')
  @UseGuards(JwtAuthGuard)
  async disable2FA(
    @GetUser() user: User,
    @Body('code') code: string,
    @Body('codeType') codeType: DisableCodeType,
  ) {
    console.log('=== Disable 2FA Controller ===');
    console.log('User:', user.id);
    console.log('Code:', code);
    console.log('Code Type:', codeType);
    
    const result = await this.authService.disable2FA(user.id, code, codeType);
    console.log('Disable 2FA Result:', result);
    return result;
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

  @Put('update-phone')
  @UseGuards(JwtAuthGuard)
  async updatePhone(
    @Req() req,
    @Body() updatePhoneDto: UpdatePhoneDto,
  ) {
    return this.authService.updatePhone(req.user.id, updatePhoneDto);
  }

  @Post('send-phone-verification')
  @UseGuards(JwtAuthGuard)
  async sendPhoneVerification(@GetUser() user: User) {
    return this.authService.sendPhoneVerification(user.id);
  }

  @Post('verify-phone')
  @UseGuards(JwtAuthGuard)
  async verifyPhone(
    @GetUser() user: User,
    @Body('code') code: string,
  ) {
    return this.authService.verifyPhone(user.id, code);
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Put('identity-details')
  @UseGuards(JwtAuthGuard)
  async updateIdentityDetails(
    @GetUser() user: User,
    @Body() updateIdentityDetailsDto: UpdateIdentityDetailsDto,
  ) {
    return this.authService.updateIdentityDetails(user.id, updateIdentityDetailsDto);
  }

  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  async verifyPassword(
    @Body('password') password: string,
    @GetUser() user: User,
  ): Promise<{ valid: boolean }> {
    console.log('=== Controller Debug ===');
    console.log('Password received in controller:', password);
    console.log('User in controller:', JSON.stringify(user, null, 2));
    console.log('======================');

    if (!password) {
      throw new BadRequestException('Please enter your current password');
    }
    return this.authService.verifyPassword(password, user);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ): Promise<void> {
    await this.authService.changePassword(changePasswordDto, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@GetUser() user: User) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('verify-2fa-action')
  @UseGuards(JwtAuthGuard)
  async verify2FAAction(
    @Body('code') code: string,
    @GetUser() user: User,
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException('2FA code is required');
    }
    await this.authService.verify2FAAction(code, user);
  }
} 