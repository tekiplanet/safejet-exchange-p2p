import { Controller, Post, Body, UnauthorizedException, HttpCode, Options } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: { email: string; password: string }) {
    try {
      console.log('Login attempt:', loginDto.email);
      const admin = await this.adminAuthService.validateAdmin(
        loginDto.email,
        loginDto.password,
      );
      
      if (!admin) {
        console.log('Invalid credentials for:', loginDto.email);
        throw new UnauthorizedException('Invalid credentials');
      }

      const result = await this.adminAuthService.login(admin);
      console.log('Login successful for:', loginDto.email);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Options('login')
  async loginOptions() {
    return '';
  }
} 