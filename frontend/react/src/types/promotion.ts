export type VoucherType = 'PERCENT' | 'AMOUNT';
export type VoucherScope = 'ALL' | 'STORE';
export type VoucherStatus = 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | 'EXHAUSTED' | 'DISABLED';

export interface AdminVoucher {
  id: string | number;
  code: string;
  type: VoucherType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  totalLimit?: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  scope: VoucherScope;
  storeId?: string | number | null;
  storeName?: string | null;
  status: string;
  createdBy?: string | number;
  approvedBy?: string | number | null;
}

export type LoyaltyTier = 'MEMBER' | 'SILVER' | 'GOLD';

export interface AdminMemberPoints {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  customerPhone?: string;
  totalPoints: number;
  tier: LoyaltyTier;
  updatedAt?: string;
}

