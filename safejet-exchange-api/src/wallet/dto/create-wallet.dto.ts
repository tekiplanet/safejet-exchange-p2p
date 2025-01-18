import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ethereum', 'bsc', 'bitcoin', 'trx', 'xrp'])
  blockchain: string;

  @IsString()
  @IsIn(['mainnet', 'testnet'])
  network: string = 'mainnet';
} 