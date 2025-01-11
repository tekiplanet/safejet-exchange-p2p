import {
  IsString,
  IsUUID,
  IsObject,
  IsBoolean,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentMethodDto {
  @IsUUID()
  paymentMethodTypeId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isDefault: boolean;

  @IsObject()
  details: Record<string, any>;
}
