import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from '../news/entities/news.entity';
import { CreateNewsDto } from './dto/news.dto';
import { UpdateNewsDto } from './dto/news.dto';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(News)
        private newsRepository: Repository<News>,
    ) {}

    async create(createNewsDto: CreateNewsDto): Promise<News> {
        const news = this.newsRepository.create(createNewsDto);
        return await this.newsRepository.save(news);
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ data: News[]; total: number }> {
        const [data, total] = await this.newsRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: {
                createdAt: 'DESC',
            },
        });
        return { data, total };
    }

    async findOne(id: string): Promise<News> {
        const news = await this.newsRepository.findOne({ where: { id } });
        if (!news) {
            throw new NotFoundException(`News with ID ${id} not found`);
        }
        return news;
    }

    async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News> {
        const news = await this.findOne(id);
        Object.assign(news, updateNewsDto);
        return await this.newsRepository.save(news);
    }

    async remove(id: string): Promise<void> {
        const news = await this.findOne(id);
        await this.newsRepository.remove(news);
    }

    async toggleStatus(id: string): Promise<News> {
        const news = await this.findOne(id);
        news.isActive = !news.isActive;
        return await this.newsRepository.save(news);
    }
} 