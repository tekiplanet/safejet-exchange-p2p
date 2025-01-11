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
      catchError(error => {
        if (error instanceof UnauthorizedException) {
          // Return a standardized error response
          return throwError(() => ({
            statusCode: 401,
            message: 'Session expired. Please login again.',
            error: 'Unauthorized',
          }));
        }
        return throwError(() => error);
      }),
    );
  }
} 