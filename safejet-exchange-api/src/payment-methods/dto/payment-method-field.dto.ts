import {
  IsString,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
} from 'class-validator';

export class PaymentMethodFieldDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsObject()
  @IsOptional()
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
  };

  @IsBoolean()
  isRequired: boolean;

  @IsNumber()
  order: number;
}
