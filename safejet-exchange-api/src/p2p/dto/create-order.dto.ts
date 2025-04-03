import { IsUUID, IsNotEmpty, IsNumber, IsEnum, IsString, IsOptional, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  offerId: string;

  @IsUUID()
  @IsNotEmpty()
  buyerId: string;

  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // If it's already a string, return it
    if (typeof value === 'string') {
      return value;
    }
    // If it's an object, convert it to a string
    return JSON.stringify(value);
  })
  paymentMetadata: string;

  @IsNumber()
  @IsNotEmpty()
  assetAmount: number;

  @IsNumber()
  @IsNotEmpty()
  currencyAmount: number;

  @IsNotEmpty()
  calculatedPrice: number;

  @IsEnum(['pending', 'paid', 'disputed', 'completed', 'cancelled'])
  buyerStatus: string;

  @IsEnum(['pending', 'confirmed', 'disputed', 'completed', 'cancelled'])
  sellerStatus: string;

  @IsOptional()
  @IsDate()
  paymentDeadline?: Date;

  @IsOptional()
  @IsDate()
  confirmationDeadline?: Date;
} 