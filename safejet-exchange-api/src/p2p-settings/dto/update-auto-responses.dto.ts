import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AutoResponseDto {
  @IsString()
  id: string;

  @IsString()
  message: string;

  @IsString()
  type: string;
}

export class UpdateAutoResponsesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoResponseDto)
  autoResponses: AutoResponseDto[];
} 