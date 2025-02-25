import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class ConvertTokenDto {
  @IsString()
  @IsNotEmpty()
  fromTokenId: string;

  @IsString()
  @IsNotEmpty()
  toTokenId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
} 