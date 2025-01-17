import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Admin } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminRepository.findOne({ where: { email } });
    if (admin && await bcrypt.compare(password, admin.password)) {
      const { password, ...result } = admin;
      return result;
    }
    return null;
  }

  async login(admin: Admin) {
    const payload = { email: admin.email, sub: admin.id, type: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
} 