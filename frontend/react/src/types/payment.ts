// Payment domain types — mirror SRS 5.3 enum & payment_db schema.

export type PaymentMethod = 'COD' | 'BANK_TRANSFER';

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'MISMATCH'
  | 'COLLECTED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type WebhookProvider = 'SEPAY' | 'CASSO';

export interface Payment {
  id: string;
  orderId: string;
  orderCode: string;
  storeId: number;
  storeName: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  qrContent?: string;
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  bankTxId: string;
  bankAccount: string;
  amount: number;
  content: string;
  receivedAt: string;
  matchedOrderCode?: string;
  storeId?: number;
  rawPayload: string;
}

export interface WebhookLog {
  id: string;
  provider: WebhookProvider;
  signatureValid: boolean;
  payload: string;
  processed: boolean;
  createdAt: string;
}

export interface BankAccountConfig {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isActive: boolean;
}
