import type { Voucher, MemberPoints, PointTransaction, LoyaltyConfig } from '../types/promotion';

export const MOCK_AVAILABLE_VOUCHERS: Voucher[] = [];

export const MOCK_MEMBER_POINTS: MemberPoints = {
  customerId: '',
  totalPoints: 0,
  tier: 'MEMBER',
};

export const MOCK_POINT_TRANSACTIONS: PointTransaction[] = [];

export const MOCK_LOYALTY_CONFIG: LoyaltyConfig = {
  earnRate: 10000, // 10.000 VND = 1 point
  redeemRate: 1000, // 1 point = 1.000 VND discount
};
