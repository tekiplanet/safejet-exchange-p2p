import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { ThrottlerModule } from '@nestjs/throttler';

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
        migrationsTableName: 'migrations'
      }),
    }),
    AuthModule,
    EmailModule,
    ThrottlerModule.forRoot([{
      ttl: 60, // time in seconds
      limit: 10, // number of requests per ttl
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
