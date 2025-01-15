import { IsString, IsIn } from 'class-validator';

export class UpdateLanguageDto {
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'ar'])
  language: string;
} 