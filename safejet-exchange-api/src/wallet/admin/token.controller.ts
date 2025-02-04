import { Controller, Get, Post, Body, Put, Param, UseGuards, UnauthorizedException, Req, Query } from '@nestjs/common';
import { Token } from '../entities/token.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminGuard } from '../../auth/admin.guard';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

// Add pagination dto
class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 10;
}

@Controller('admin/deposits')
@UseGuards(AdminGuard)
export class AdminTokenController {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>
    ) {}

    @Get('tokens')
    async getAllTokens(@Query() query: PaginationQueryDto): Promise<{data: Token[], total: number}> {
        try {
            const page = query.page || 1;
            const limit = query.limit || 10;

            const [tokens, total] = await this.tokenRepository.findAndCount({
                order: {
                    blockchain: 'ASC',
                    symbol: 'ASC'
                },
                skip: (page - 1) * limit,
                take: limit
            });

            return {
                data: tokens,
                total
            };
        } catch (error) {
            console.error('Error in getAllTokens:', error);
            throw error;
        }
    }

    @Post('tokens')
    async createToken(@Body() tokenData: Partial<Token>): Promise<Token> {
        const token = this.tokenRepository.create(tokenData);
        return this.tokenRepository.save(token);
    }

    @Put('tokens/:id')
    async updateToken(
        @Param('id') id: string,
        @Body() tokenData: Partial<Token>
    ): Promise<Token> {
        await this.tokenRepository.update(id, tokenData);
        return this.tokenRepository.findOne({ where: { id } });
    }
} 