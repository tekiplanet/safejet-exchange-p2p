import { IsString, IsNumber, IsArray, IsIn, IsNotEmpty, ValidateNested, Min, Max, ArrayMinSize, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  typeId: string;

  @IsString()
  @IsOptional()
  methodId?: string;
}

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  priceUSD: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto[];

  @IsString()
  @IsOptional()
  terms?: string;

  @IsBoolean()
  isBuyOffer: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  priceType: 'percentage' | 'fixed';

  @IsNumber()
  @Min(-100)
  @Max(100)
  priceDelta: number;
} 