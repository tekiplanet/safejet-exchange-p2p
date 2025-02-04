import { Controller, Get, Post, Body, Put, Param, UseGuards } from '@nestjs/common';
import { Token } from '../entities/token.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminGuard } from '../../auth/guards/admin.guard';

@Controller('admin/tokens')
@UseGuards(AdminGuard)
export class AdminTokenController {
    constructor(
        @InjectRepository(Token)
        private tokenRepository: Repository<Token>
    ) {}

    @Get()
    async getAllTokens(): Promise<Token[]> {
        return this.tokenRepository.find({
            order: {
                blockchain: 'ASC',
                symbol: 'ASC'
            }
        });
    }

    @Post()
    async createToken(@Body() tokenData: Partial<Token>): Promise<Token> {
        const token = this.tokenRepository.create(tokenData);
        return this.tokenRepository.save(token);
    }

    @Put(':id')
    async updateToken(
        @Param('id') id: string,
        @Body() tokenData: Partial<Token>
    ): Promise<Token> {
        await this.tokenRepository.update(id, tokenData);
        return this.tokenRepository.findOne({ where: { id } });
    }
} 