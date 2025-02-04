import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {
    console.log('AdminGuard initialized with JWT secret:', this.jwtService['secretKey'] ? 'Present' : 'Missing');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('=== AdminGuard ===');
    console.log('Path:', request.path);
    console.log('Method:', request.method);
    
    const token = this.extractTokenFromHeader(request);
    console.log('Token present:', !!token);
    
    if (!token) {
      console.log('No token found in request');
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log('Token payload:', payload);
      
      if (payload.type !== 'admin') {
        console.log('User is not admin:', payload.type);
        return false;
      }
      request.admin = payload;
      console.log('Admin access granted');
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 