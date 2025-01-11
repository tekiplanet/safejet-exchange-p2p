import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  Name: string;

  @IsString()
  Icon: string;

  @IsBoolean()
  @IsOptional()
  IsDefault?: boolean;

  @IsObject()
  Details: Record<string, any>;
} 