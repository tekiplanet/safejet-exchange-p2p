import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof UnauthorizedException) {
          // Get the original error message
          const originalMessage = error.message;
          
          // Only convert specific JWT-related errors to "Session expired"
          const jwtErrors = [
            'Invalid token',
            'Token expired',
            'Token malformed',
            'No auth token',
          ];

          if (jwtErrors.some(msg => originalMessage.toLowerCase().includes(msg.toLowerCase()))) {
            return throwError(() => ({
              statusCode: 401,
              message: 'Session expired. Please login again.',
              error: 'Unauthorized',
            }));
          }
          
          // For all other unauthorized errors, preserve the original message
          return throwError(() => ({
            statusCode: 401,
            message: originalMessage,
            error: 'Unauthorized',
          }));
        }
        return throwError(() => error);
      }),
    );
  }
}
