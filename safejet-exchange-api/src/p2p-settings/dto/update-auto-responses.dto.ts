import { IsArray, ValidateNested, IsString, IsHexColor } from 'class-validator';
import { Type } from 'class-transformer';

export class AutoResponseDto {
  @IsString()
  id: string;

  @IsString()
  message: string;

  @IsString()
  type: string;

  @IsString()
  icon: string;

  @IsHexColor()
  color: string;
}

export class UpdateAutoResponsesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoResponseDto)
  autoResponses: AutoResponseDto[];
} 