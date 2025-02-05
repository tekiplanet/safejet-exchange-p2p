import { IsString, IsNumber, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  symbol: string;

  @IsString()
  name: string;

  @IsString()
  blockchain: string;

  @IsString()
  @IsOptional()
  contractAddress?: string;

  @IsNumber()
  decimals: number;

  @IsString()
  @IsOptional()
  baseSymbol?: string;

  @IsString()
  @IsOptional()
  networkVersion?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: {
    isNative?: boolean;
    networks?: string[];
    icon?: string;
    priceFeeds?: {
      [key: string]: {
        provider: 'chainlink' | 'binance' | 'coingecko';
        address?: string;
        symbol?: string;
        interval?: number;
      };
    };
  };

  @IsObject()
  @IsOptional()
  networkConfigs?: {
    [version: string]: {
      [network: string]: {
        network: string;
        version: string;
        isActive: boolean;
        blockchain: string;
        arrivalTime: string;
        requiredFields: {
          tag: boolean;
          memo: boolean;
        }
      }
    }
  };
} 