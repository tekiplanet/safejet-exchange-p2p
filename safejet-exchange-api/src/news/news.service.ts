import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from './entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { PaginatedNewsResponse } from './dto/paginated-news.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
  ) {}

  async create(createNewsDto: CreateNewsDto, adminId: string): Promise<News> {
    const news = this.newsRepository.create({
      ...createNewsDto,
      createdBy: adminId,
    });
    return this.newsRepository.save(news);
  }

  async findAll(): Promise<News[]> {
    return this.newsRepository.find({
      order: {
        createdAt: 'DESC',
      },
      relations: ['creator'],
    });
  }

  async findActive(): Promise<News[]> {
    return this.newsRepository.find({
      where: { isActive: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<News> {
    const news = await this.newsRepository.findOne({
      where: { id },
      relations: ['creator', 'updater'],
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, adminId: string): Promise<News> {
    const news = await this.findOne(id);
    
    Object.assign(news, {
      ...updateNewsDto,
      updatedBy: adminId,
    });

    return this.newsRepository.save(news);
  }

  async remove(id: string): Promise<void> {
    const news = await this.findOne(id);
    await this.newsRepository.remove(news);
  }

  async getPaginatedNews(page: number = 1, limit: number = 10): Promise<PaginatedNewsResponse> {
    const [items, total] = await this.newsRepository.findAndCount({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async findOneById(id: string): Promise<News> {
    const news = await this.newsRepository.findOne({
      where: { id, isActive: true },
    });

    if (!news) {
      throw new NotFoundException(`News with ID "${id}" not found`);
    }

    return news;
  }
} 