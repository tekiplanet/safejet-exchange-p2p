import { Controller, Get, Query, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../wallet/entities/token.entity';

@Controller('tokens')
export class TokensController {
  private readonly logger = new Logger(TokensController.name);
  
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  @Get('market')
  async getMarketTokens() {
    try {
      // Get all active tokens
      const tokens = await this.tokenRepository.find({
        where: { isActive: true },
        order: { currentPrice: 'DESC' },
      });

      // Group tokens by baseSymbol to unify tokens across networks
      const tokenGroups = tokens.reduce<Record<string, Token[]>>((groups, token) => {
        const baseSymbol = token.baseSymbol || token.symbol;
        if (!groups[baseSymbol]) {
          groups[baseSymbol] = [];
        }
        groups[baseSymbol].push(token);
        return groups;
      }, {});

      // Return only one token per baseSymbol (usually the first/primary one)
      const unifiedTokens = Object.values(tokenGroups).map(group => {
        // Sort group by price descending to get the most valuable variant first
        group.sort((a, b) => b.currentPrice - a.currentPrice);
        return group[0];
      });

      // Sort tokens by market cap if available, otherwise by price
      unifiedTokens.sort((a, b) => {
        // First sort by marketCap if available
        if (a.marketCap && b.marketCap) {
          return Number(b.marketCap) - Number(a.marketCap);
        }
        // Then by price
        return b.currentPrice - a.currentPrice;
      });

      return { tokens: unifiedTokens };
    } catch (error) {
      this.logger.error(`Error fetching market tokens: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('search')
  async searchTokens(@Query('query') query: string) {
    try {
      if (!query || query.length < 2) {
        return { tokens: [] };
      }

      const searchTerm = `%${query.toLowerCase()}%`;
      
      const tokens = await this.tokenRepository
        .createQueryBuilder('token')
        .where('LOWER(token.symbol) LIKE :searchTerm', { searchTerm })
        .orWhere('LOWER(token.name) LIKE :searchTerm', { searchTerm })
        .andWhere('token.isActive = :isActive', { isActive: true })
        .orderBy('token.currentPrice', 'DESC')
        .getMany();

      // Group by baseSymbol for unified view
      const tokenGroups = tokens.reduce<Record<string, Token[]>>((groups, token) => {
        const baseSymbol = token.baseSymbol || token.symbol;
        if (!groups[baseSymbol]) {
          groups[baseSymbol] = [];
        }
        groups[baseSymbol].push(token);
        return groups;
      }, {});

      // Return only one token per baseSymbol
      const unifiedTokens = Object.values(tokenGroups).map(group => group[0]);

      return { tokens: unifiedTokens };
    } catch (error) {
      this.logger.error(`Error searching tokens: ${error.message}`, error.stack);
      throw error;
    }
  }
} 