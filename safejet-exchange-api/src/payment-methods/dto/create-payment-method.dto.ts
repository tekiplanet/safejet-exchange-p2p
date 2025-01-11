import {
  IsString,
  IsUUID,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentMethodDto {
  @IsUUID()
  paymentMethodTypeId: string;

  @IsBoolean()
  isDefault: boolean;

  @IsObject()
  details: Record<string, any>;
}
