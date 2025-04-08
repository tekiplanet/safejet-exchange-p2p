import { IsString, IsEnum, IsBoolean, IsOptional, IsUrl } from 'class-validator';
import { NewsType, NewsPriority } from '../../news/entities/news.entity';

export class CreateNewsDto {
    @IsString()
    title: string;

    @IsString()
    content: string;

    @IsString()
    shortDescription: string;

    @IsEnum(NewsType)
    type: NewsType;

    @IsEnum(NewsPriority)
    priority: NewsPriority;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsUrl()
    @IsOptional()
    externalLink?: string;
}

export class UpdateNewsDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    content?: string;

    @IsString()
    @IsOptional()
    shortDescription?: string;

    @IsEnum(NewsType)
    @IsOptional()
    type?: NewsType;

    @IsEnum(NewsPriority)
    @IsOptional()
    priority?: NewsPriority;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsUrl()
    @IsOptional()
    externalLink?: string;
} 