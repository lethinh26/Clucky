export type VoucherType = 'PERCENT' | 'AMOUNT';
export type VoucherScope = 'ALL' | 'STORE';
export type VoucherStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'UPCOMING'
  | 'EXHAUSTED'
  | 'DISABLED'
  | 'PENDING_APPROVAL'
  | 'REJECTED';

export interface AdminVoucher {
  id: string | number;
  code: string;
  title?: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  totalLimit?: number | null;
  usedCount: number;
  reservedCount?: number;
  version?: number;
  startAt: string;
  endAt: string;
  scope: VoucherScope;
  storeId?: string | number | null;
  storeName?: string | null;
  status: VoucherStatus | string;
  effectiveStatus?: VoucherStatus | string;
  createdBy?: string | number;
  approvedBy?: string | number | null;
  rejectionReason?: string | null;
  rejectedBy?: string | number | null;
  rejectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherPayload {
  version?: number;
  code: string;
  title?: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  totalLimit?: number | null;
  startAt: string;
  endAt: string;
  scope: VoucherScope;
  storeId?: number | null;
  status?: VoucherStatus;
}

export interface VoucherProposal {
  id: string | number;
  code: string;
  title: string;
  type: VoucherType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  totalLimit?: number | null;
  startAt: string;
  endAt: string;
  storeId: number;
  storeName: string;
  proposedBy: string;
  proposalReason: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  proposedAt: string;
}

export interface PromoBanner {
  id: string | number;
  title: string;
  imageUrl: string;
  targetUrl?: string;
  position: 'HERO_HOME' | 'POPUP' | 'PROMO_STRIP';
  startAt: string;
  endAt: string;
  isActive: boolean;
  order: number;
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
