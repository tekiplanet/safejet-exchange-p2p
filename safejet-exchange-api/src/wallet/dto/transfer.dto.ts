import { IsNotEmpty, IsString, IsNumber, IsUUID, IsIn } from 'class-validator';

export class TransferDto {
  @IsUUID()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['spot', 'funding'])
  fromType: 'spot' | 'funding';

  @IsString()
  @IsNotEmpty()
  @IsIn(['spot', 'funding'])
  toType: 'spot' | 'funding';
} 