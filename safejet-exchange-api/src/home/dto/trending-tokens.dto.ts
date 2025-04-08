interface TokenVariant {
  id: string;
  symbol: string;
  name: string;
  networkVersion: string;
  blockchain: string;
}

export interface TrendingToken {
  symbol: string;
  name: string;
  baseSymbol: string;
  currentPrice: string;
  priceChange24h: number;
  metadata: any;
  variants: TokenVariant[];
}

export interface TrendingTokensResponse {
  tokens: TrendingToken[];
}

export class TrendingTokenDto {
  symbol: string;
  name: string;
  baseSymbol: string;
  currentPrice: string;
  priceChange24h: number;
  metadata: any;
  variants: TokenVariant[];
} 