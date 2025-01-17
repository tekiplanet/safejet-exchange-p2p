import { Controller, Post, Get, Body, UseGuards, Param, Put } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { TokenManagementService } from './token-management.service';
import { CreateTokenDto } from './dto/create-token.dto';

@Controller('admin/tokens')
@UseGuards(AdminGuard)
export class TokenManagementController {
  constructor(private readonly tokenManagementService: TokenManagementService) {}

  @Post()
  async createToken(@Body() createTokenDto: CreateTokenDto) {
    return this.tokenManagementService.createToken(createTokenDto);
  }

  @Get()
  async getAllTokens() {
    return this.tokenManagementService.getAllTokens();
  }

  @Get(':id')
  async getToken(@Param('id') id: string) {
    return this.tokenManagementService.getToken(id);
  }

  @Put(':id/activate')
  async activateToken(@Param('id') id: string) {
    return this.tokenManagementService.updateTokenStatus(id, true);
  }

  @Put(':id/deactivate')
  async deactivateToken(@Param('id') id: string) {
    return this.tokenManagementService.updateTokenStatus(id, false);
  }

  @Post('batch')
  async createTokens(@Body() createTokenDtos: CreateTokenDto[]) {
    const results = [];
    const errors = [];

    for (const tokenDto of createTokenDtos) {
      try {
        const token = await this.tokenManagementService.createToken(tokenDto);
        results.push(token);
      } catch (error) {
        errors.push({
          token: tokenDto.symbol,
          error: error.message
        });
      }
    }

    return {
      successfulTokens: results,
      failedTokens: errors,
      total: createTokenDtos.length,
      successCount: results.length,
      failureCount: errors.length
    };
  }
} 