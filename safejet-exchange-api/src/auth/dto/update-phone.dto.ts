import { IsString, IsNotEmpty } from 'class-validator';

export class UpdatePhoneDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  countryName: string;

  @IsString()
  @IsNotEmpty()
  phoneWithoutCode: string;
} 