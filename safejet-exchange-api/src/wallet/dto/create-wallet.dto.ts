import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  blockchain: string;

  @IsString()
  @IsIn(['mainnet', 'testnet'])
  network: string = 'mainnet';
} 