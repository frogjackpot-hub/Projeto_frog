export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  gameId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  balance: number;
  userId: string;
}

export interface TransactionRequest {
  amount: number;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: {
    transaction: Transaction;
    newBalance: number;
  };
}