export interface NetworkConfig {
  network: string;
  version: string;
  isActive: boolean;
  blockchain: string;
  arrivalTime: string;
  requiredFields: {
    tag: boolean;
    memo: boolean;
  };
  fee: {
    type: 'percentage' | 'usd' | 'token';
    value: string;
  };
  conversionFee: {
    type: 'percentage' | 'usd' | 'token';
    value: string;
  };
  withdrawMessage?: string;
  depositMessage?: string;
  minWithdrawal: string;
}

export interface NetworkResponse {
  blockchain: string;
  version: string;
  network: string;
  arrivalTime: string;
  requiredFields: {
    memo: boolean;
    tag: boolean;
  };
  fee: {
    type: 'percentage' | 'usd' | 'token';
    value: string;
  };
} 