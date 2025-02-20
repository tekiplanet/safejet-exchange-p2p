import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAddressBookDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  blockchain: string;

  @IsNotEmpty()
  @IsString()
  network: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsString()
  tag?: string;
} 