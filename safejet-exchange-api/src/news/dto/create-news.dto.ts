import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NewsType, NewsPriority } from '../entities/news.entity';

export class CreateNewsDto {
  @IsEnum(NewsType)
  @IsNotEmpty()
  type: NewsType;

  @IsEnum(NewsPriority)
  @IsNotEmpty()
  priority: NewsPriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  shortDescription: string;

  @IsString()
  @IsNotEmpty()
  content: string;
} 