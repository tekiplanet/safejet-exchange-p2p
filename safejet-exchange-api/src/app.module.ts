import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { KYCModule } from './kyc/kyc.module';
import { SumsubModule } from './sumsub/sumsub.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from './auth/auth.interceptor';
import { SeedersModule } from './seeders/seeders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        logging: true,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: ['dist/src/migrations/*.js'],
        migrationsRun: false,
        migrationsTableName: 'migrations',
      }),
    }),
    AuthModule,
    EmailModule,
    KYCModule,
    SumsubModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60, // time in seconds
        limit: 10, // number of requests per ttl
      },
    ]),
    PaymentMethodsModule,
    SeedersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
  ],
})
export class AppModule {}
