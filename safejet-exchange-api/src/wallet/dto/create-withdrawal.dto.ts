import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNotEmpty()
  @IsString()
  tokenId: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  networkVersion: string; // e.g., "ERC20", "TRC20", "BEP20"

  @IsNotEmpty()
  @IsString()
  network: string; // e.g., "mainnet", "testnet"

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  twoFactorCode?: string;
} 