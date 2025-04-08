export interface MarketOverviewResponse {
  price: string;
  priceChange24h: number;
  marketCap: string;
  volume24h: string;
  dominance: number;
  circulatingSupply: string;
  chartData: Array<[number, number]>; // [timestamp, price]
}

export class MarketOverviewDto {
  price: string;
  priceChange24h: number;
  marketCap: string;
  volume24h: string;
  dominance: number;
  circulatingSupply: string;
  chartData: Array<[number, number]>;
} 