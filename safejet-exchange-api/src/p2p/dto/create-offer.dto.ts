import { IsString, IsNumber, IsArray, IsIn, IsNotEmpty, ValidateNested, Min, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  typeId: string;

  @IsString()
  @IsNotEmpty()
  methodId?: string;
}

export class CreateOfferDto {
  @IsIn(['buy', 'sell'])
  type: 'buy' | 'sell';

  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto[];

  @IsString()
  @IsNotEmpty()
  terms: string;

  @IsBoolean()
  isBuyOffer: boolean;
} 