import { IsEnum, IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { NewsType, NewsPriority } from '../entities/news.entity';

export class UpdateNewsDto {
  @IsEnum(NewsType)
  @IsOptional()
  type?: NewsType;

  @IsEnum(NewsPriority)
  @IsOptional()
  priority?: NewsPriority;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  shortDescription?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 