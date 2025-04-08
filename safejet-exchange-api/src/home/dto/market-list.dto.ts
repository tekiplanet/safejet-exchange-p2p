export interface TokenVariant {
  id: string;
  symbol: string;
  name: string;
  networkVersion: string;
  blockchain: string;
}

export interface MarketToken {
  symbol: string;
  name: string;
  baseSymbol: string;
  currentPrice: string;
  priceChange24h: number;
  volume24h: string;
  metadata: any;
  variants: TokenVariant[];
}

export class MarketListResponse {
  tokens: MarketToken[];
  total: number;
} 