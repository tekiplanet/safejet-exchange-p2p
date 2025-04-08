import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/news.dto';
import { UpdateNewsDto } from './dto/news.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('news/admin')
@UseGuards(AdminGuard)
export class NewsController {
    constructor(private readonly newsService: NewsService) {}

    @Post()
    async create(@Body() createNewsDto: CreateNewsDto) {
        return await this.newsService.create(createNewsDto);
    }

    @Get()
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return await this.newsService.findAll(page, limit);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.newsService.findOne(id);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() updateNewsDto: UpdateNewsDto,
    ) {
        return await this.newsService.update(id, updateNewsDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.newsService.remove(id);
    }

    @Put(':id/toggle-status')
    async toggleStatus(@Param('id') id: string) {
        return await this.newsService.toggleStatus(id);
    }
} 