import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const admin = await this.adminAuthService.validateAdmin(
      loginDto.email,
      loginDto.password,
    );
    
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.adminAuthService.login(admin);
  }
} 