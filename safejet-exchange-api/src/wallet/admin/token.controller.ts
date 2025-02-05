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
    async getAllTokens(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string
    ) {
        const skip = (page - 1) * limit;
        
        let query = this.tokenRepository.createQueryBuilder('token');
        
        if (search) {
            query = query.where(
                'LOWER(token.symbol) LIKE LOWER(:search) OR ' +
                'LOWER(token.name) LIKE LOWER(:search) OR ' +
                'LOWER(token.blockchain) LIKE LOWER(:search) OR ' +
                'LOWER(token.contractAddress) LIKE LOWER(:search)',
                { search: `%${search}%` }
            );
        }

        const [tokens, total] = await Promise.all([
            query.skip(skip).take(limit).getMany(),
            query.getCount()
        ]);

        return {
            data: tokens,
            total,
            page,
            limit
        };
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