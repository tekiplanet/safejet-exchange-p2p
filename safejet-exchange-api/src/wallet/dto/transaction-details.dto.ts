export class TransactionDetailsDto {
  id: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'transfer';
  amount: string;
  tokenSymbol: string;
  status: string;
  createdAt: string;
  metadata: any;
  
  // Additional fields for detailed view
  txHash?: string;
  blockchain?: string;
  network?: string;
  networkVersion?: string;
  blockNumber?: number;
  fee?: string;
  from?: string;
  to?: string;
  
  // Conversion specific fields
  toAmount?: string;
  toToken?: string;
  exchangeRate?: string;
  
  // Transfer specific fields
  fromType?: string;
  toType?: string;
  
  // Withdrawal specific fields
  address?: string;
  memo?: string;
} 