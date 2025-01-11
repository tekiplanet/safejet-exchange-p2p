import { IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodFieldDto } from './payment-method-field.dto';

export class PaymentMethodTypeDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  icon: string;

  @IsString()
  description: string;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodFieldDto)
  fields: PaymentMethodFieldDto[];
} 