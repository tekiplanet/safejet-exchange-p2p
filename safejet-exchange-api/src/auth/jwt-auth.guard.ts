import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError } from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('=== JWT Guard Debug ===');
    console.log('User from JWT:', JSON.stringify(user, null, 2));
    console.log('Error:', err);
    console.log('Info:', info);
    console.log('====================');

    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
