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

export type BannerPosition = 'HERO_HOME' | 'POPUP' | 'PROMO_STRIP';
export type BannerEffectiveStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'DISABLED';

export interface PromoBanner {
  id: number;
  title: string;
  imageUrl: string;
  imagePublicId?: string | null;
  linkUrl?: string | null;
  targetUrl?: string | null;
  position: BannerPosition;
  displayOrder: number;
  order?: number;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  version: number;
  effectiveStatus?: BannerEffectiveStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerPayload {
  title: string;
  linkUrl?: string | null;
  position: BannerPosition;
  displayOrder: number;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  expectedVersion?: number;
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
