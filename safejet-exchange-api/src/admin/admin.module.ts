import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Admin } from './entities/admin.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminDepositController } from './admin-deposit.controller';
import { AdminGuard } from '../auth/admin.guard';
import { WalletModule } from '../wallet/wallet.module';
import { SystemSettings } from '../wallet/entities/system-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, SystemSettings]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    WalletModule,
  ],
  providers: [AdminAuthService, AdminGuard],
  controllers: [AdminAuthController, AdminDepositController],
  exports: [AdminAuthService, AdminGuard, JwtModule],
})
export class AdminModule {} 