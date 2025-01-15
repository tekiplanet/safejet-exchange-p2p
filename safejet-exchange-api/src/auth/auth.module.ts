import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { EmailModule } from '../email/email.module';
import { JwtStrategy } from './jwt.strategy';
import { LoginTrackerService } from './login-tracker.service';
import { KYCLevel } from './entities/kyc-level.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { P2PSettingsModule } from '../p2p-settings/p2p-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KYCLevel]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION') },
      }),
    }),
    EmailModule,
    TwilioModule,
    P2PSettingsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginTrackerService],
  exports: [AuthService],
})
export class AuthModule {}
