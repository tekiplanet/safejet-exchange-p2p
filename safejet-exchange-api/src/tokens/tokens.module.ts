import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from '../wallet/entities/token.entity';
import { TokensController } from './tokens.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
  ],
  controllers: [TokensController],
  providers: [],
})
export class TokensModule {} 