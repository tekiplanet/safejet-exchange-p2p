export class TransactionHistoryDto {
  id: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'transfer';
  amount: string;
  tokenSymbol: string;
  status: string;
  createdAt: Date;
  metadata: any;
} 