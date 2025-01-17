import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';
import { CreateTokenDto } from './dto/create-token.dto';

@Injectable()
export class TokenManagementService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  async createToken(createTokenDto: CreateTokenDto): Promise<Token> {
    // Check if token already exists
    const existingToken = await this.tokenRepository.findOne({
      where: {
        blockchain: createTokenDto.blockchain,
        symbol: createTokenDto.symbol,
        contractAddress: createTokenDto.contractAddress,
      },
    });

    if (existingToken) {
      throw new BadRequestException('Token already exists');
    }

    // If it's a new token version (ERC20, TRC20, etc.), verify baseSymbol exists
    if (createTokenDto.baseSymbol && createTokenDto.baseSymbol !== createTokenDto.symbol) {
      const baseToken = await this.tokenRepository.findOne({
        where: { symbol: createTokenDto.baseSymbol },
      });

      if (!baseToken) {
        throw new BadRequestException('Base token does not exist');
      }
    }

    // Set default values if not provided
    const tokenData = {
      ...createTokenDto,
      baseSymbol: createTokenDto.baseSymbol || createTokenDto.symbol,
      networkVersion: createTokenDto.networkVersion || 'NATIVE',
      isActive: createTokenDto.isActive ?? true,
    };

    const token = this.tokenRepository.create(tokenData);
    return this.tokenRepository.save(token);
  }

  async getAllTokens(): Promise<Token[]> {
    return this.tokenRepository.find({
      order: {
        symbol: 'ASC',
        blockchain: 'ASC',
      },
    });
  }

  async getToken(id: string): Promise<Token> {
    const token = await this.tokenRepository.findOne({
      where: { id },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    return token;
  }

  async updateTokenStatus(id: string, isActive: boolean): Promise<Token> {
    const token = await this.getToken(id);
    token.isActive = isActive;
    return this.tokenRepository.save(token);
  }
} 