import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { tokenSeeds } from '../wallet/seeds/tokens.seed';

@Injectable()
export class TokensSeederService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  async seed() {
    console.log('Starting token seeding...');
    
    for (const tokenData of tokenSeeds) {
      const existingToken = await this.tokenRepository.findOne({
        where: {
          blockchain: tokenData.blockchain,
          symbol: tokenData.symbol,
          contractAddress: tokenData.contractAddress,
        },
      });

      if (!existingToken) {
        await this.tokenRepository.save(tokenData);
        console.log(`Created token: ${tokenData.symbol} on ${tokenData.blockchain}`);
      } else {
        console.log(`Token already exists: ${tokenData.symbol} on ${tokenData.blockchain}`);
      }
    }

    console.log('Token seeding completed');
  }
} 