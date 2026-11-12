export type VoucherType = 'PERCENT' | 'AMOUNT';
export type VoucherScope = 'ALL' | 'STORE';
export type VoucherStatus = 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | 'EXHAUSTED' | 'DISABLED';

export interface Voucher {
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
  status?: string;
  title?: string;
  description?: string;
}

export type LoyaltyTier = 'MEMBER' | 'SILVER' | 'GOLD';
export type PointTransactionType = 'EARN' | 'REDEEM' | 'ADJUST';

export interface MemberPoints {
  customerId: string | number;
  totalPoints: number;
  tier: LoyaltyTier;
  updatedAt?: string;
}

export interface PointTransaction {
  id: string | number;
  customerId: string | number;
  orderId?: string | number | null;
  change: number;
  balanceAfter: number;
  type: PointTransactionType;
  createdAt: string;
  reason?: string;
}

export interface LoyaltyConfig {
  earnRate: number; // e.g. 10000 VND -> 1 point
  redeemRate: number; // e.g. 1 point -> 1000 VND
}

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  label: string;
  minPoints: number;
  discountPercent: number;
  badgeColor: string;
  benefits: string[];
  nextTier: LoyaltyTier | null;
  nextTierPoints: number | null;
}

export type BannerPosition = 'HERO_HOME' | 'POPUP' | 'PROMO_STRIP';

export interface PromoBanner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  position: BannerPosition;
  displayOrder: number;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  version?: number;
}
