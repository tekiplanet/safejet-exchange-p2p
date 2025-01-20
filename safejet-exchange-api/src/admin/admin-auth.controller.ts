import { Controller, Post, Body, UnauthorizedException, HttpCode, Options } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: { email: string; password: string }) {
    try {
      const admin = await this.adminAuthService.validateAdmin(
        loginDto.email,
        loginDto.password,
      );
      
      if (!admin) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.adminAuthService.login(admin);
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