import type {
  Voucher,
  VoucherStatus,
  VoucherType,
  LoyaltyTier,
  LoyaltyTierInfo,
  MemberPoints,
  PointTransaction,
} from './types/promotion';
import {
  MOCK_AVAILABLE_VOUCHERS,
  MOCK_MEMBER_POINTS,
  MOCK_POINT_TRANSACTIONS,
  MOCK_LOYALTY_CONFIG,
} from './mock/promotion-mock-data';

export {
  MOCK_AVAILABLE_VOUCHERS,
  MOCK_MEMBER_POINTS,
  MOCK_POINT_TRANSACTIONS,
  MOCK_LOYALTY_CONFIG,
};

export const LOYALTY_TIER_CONFIG: Record<LoyaltyTier, LoyaltyTierInfo> = {
  MEMBER: {
    tier: 'MEMBER',
    label: 'Thành viên Clucky',
    minPoints: 0,
    discountPercent: 0,
    badgeColor: '#A16207', // Warm Bronze / Amber
    benefits: [
      'Tích điểm mỗi đơn hàng (10.000đ = 1 điểm)',
      'Đổi điểm giảm trừ trực tiếp khi thanh toán',
      'Nhận thông báo ưu đãi độc quyền theo tuần',
    ],
    nextTier: 'SILVER',
    nextTierPoints: 1000,
  },
  SILVER: {
    tier: 'SILVER',
    label: 'Thành viên Bạc',
    minPoints: 1000,
    discountPercent: 3,
    badgeColor: '#64748B', // Silver slate
    benefits: [
      'Giảm trực tiếp 3% trên toàn bộ hóa đơn',
      'Nhân đôi điểm tích lũy vào tuần lễ sinh nhật',
      'Ưu tiên xử lý khi đặt món vào giờ cao điểm',
    ],
    nextTier: 'GOLD',
    nextTierPoints: 5000,
  },
  GOLD: {
    tier: 'GOLD',
    label: 'Thành viên Vàng',
    minPoints: 5000,
    discountPercent: 5,
    badgeColor: '#D97706', // Radiant Gold
    benefits: [
      'Giảm trực tiếp 5% trên toàn bộ hóa đơn',
      'Ưu tiên đặc quyền CSKH và giao hàng nhanh',
      'Quà tặng combo sinh nhật và mã freeship hàng tháng',
    ],
    nextTier: null,
    nextTierPoints: null,
  },
};

export function getVoucherStatus(voucher: Partial<Voucher>, now = new Date()): VoucherStatus {
  if (!voucher) return 'DISABLED';
  if (voucher.status === 'DISABLED' || voucher.status === 'INACTIVE') return 'DISABLED';

  const currentTime = now.getTime();
  if (voucher.startAt && new Date(voucher.startAt).getTime() > currentTime) {
    return 'UPCOMING';
  }
  if (voucher.endAt && new Date(voucher.endAt).getTime() < currentTime) {
    return 'EXPIRED';
  }
  if (
    typeof voucher.totalLimit === 'number' &&
    voucher.totalLimit > 0 &&
    typeof voucher.usedCount === 'number' &&
    voucher.usedCount >= voucher.totalLimit
  ) {
    return 'EXHAUSTED';
  }

  return 'ACTIVE';
}

export function formatVoucherDiscount(
  type: VoucherType,
  value: number,
  maxDiscount?: number | null
): string {
  const safeValue = Math.max(0, Number(value) || 0);
  if (type === 'PERCENT') {
    const percentText = `Giảm ${safeValue}%`;
    if (maxDiscount && maxDiscount > 0) {
      return `${percentText} (tối đa ${maxDiscount.toLocaleString('vi-VN')}đ)`;
    }
    return percentText;
  }
  return `Giảm ${safeValue.toLocaleString('vi-VN')}đ`;
}

export function formatVoucherCondition(
  minOrderAmount: number,
  maxDiscount?: number | null,
  type?: VoucherType
): string {
  const safeMin = Math.max(0, Number(minOrderAmount) || 0);
  const parts: string[] = [];

  if (safeMin > 0) {
    parts.push(`Đơn từ ${safeMin.toLocaleString('vi-VN')}đ`);
  } else {
    parts.push('Mọi giá trị đơn');
  }

  if (type === 'PERCENT' && maxDiscount && maxDiscount > 0) {
    parts.push(`tối đa ${maxDiscount.toLocaleString('vi-VN')}đ`);
  }

  return parts.join(' • ');
}

export interface VoucherValidationResult {
  valid: boolean;
  discountAmount: number;
  reason?: string;
  voucher?: Voucher;
}

export function validateVoucherForOrder(
  voucher: Voucher,
  orderAmount: number,
  storeId?: string | number | null,
  now = new Date()
): VoucherValidationResult {
  if (!voucher || !voucher.code) {
    return { valid: false, discountAmount: 0, reason: 'Mã voucher không tồn tại.' };
  }

  const status = getVoucherStatus(voucher, now);
  if (status === 'EXPIRED') {
    return { valid: false, discountAmount: 0, reason: 'Voucher đã hết hạn sử dụng.' };
  }
  if (status === 'UPCOMING') {
    return { valid: false, discountAmount: 0, reason: 'Voucher chưa đến thời gian áp dụng.' };
  }
  if (status === 'EXHAUSTED') {
    return { valid: false, discountAmount: 0, reason: 'Voucher đã hết lượt sử dụng.' };
  }
  if (status === 'DISABLED') {
    return { valid: false, discountAmount: 0, reason: 'Voucher hiện đang tạm khóa.' };
  }

  // Validate Store Scope
  if (voucher.scope === 'STORE') {
    if (!voucher.storeId) {
      return { valid: false, discountAmount: 0, reason: 'Voucher chi nhánh không hợp lệ.' };
    }
    if (storeId && String(voucher.storeId) !== String(storeId)) {
      const storeNotice = voucher.storeName
        ? `chỉ áp dụng tại chi nhánh ${voucher.storeName}.`
        : 'không áp dụng cho chi nhánh này.';
      return { valid: false, discountAmount: 0, reason: `Voucher ${storeNotice}` };
    }
  }

  // Validate Minimum Order Amount
  const safeOrderAmount = Math.max(0, Number(orderAmount) || 0);
  const minRequired = Math.max(0, Number(voucher.minOrderAmount) || 0);
  if (safeOrderAmount < minRequired) {
    const missing = minRequired - safeOrderAmount;
    return {
      valid: false,
      discountAmount: 0,
      reason: `Đơn hàng chưa đạt mức tối thiểu ${minRequired.toLocaleString(
        'vi-VN'
      )}đ (còn thiếu ${missing.toLocaleString('vi-VN')}đ).`,
    };
  }

  // Calculate Discount Amount
  let calculated = 0;
  if (voucher.type === 'PERCENT') {
    const pct = Math.max(0, Math.min(100, Number(voucher.value) || 0));
    calculated = Math.round((safeOrderAmount * pct) / 100);
    if (voucher.maxDiscount && voucher.maxDiscount > 0) {
      calculated = Math.min(calculated, Number(voucher.maxDiscount));
    }
  } else {
    calculated = Math.max(0, Number(voucher.value) || 0);
  }

  // Discount cannot exceed order amount
  const finalDiscount = Math.min(calculated, safeOrderAmount);

  return {
    valid: true,
    discountAmount: finalDiscount,
    voucher,
  };
}

export interface TierProgressResult {
  tier: LoyaltyTier;
  tierInfo: LoyaltyTierInfo;
  totalPoints: number;
  nextTier: LoyaltyTier | null;
  pointsToNextTier: number;
  progressPercent: number; // 0 to 100
  isMaxTier: boolean;
}

export function calculateTierProgress(pointsInput: number): TierProgressResult {
  const points = Math.max(0, Math.floor(Number(pointsInput) || 0));

  let tier: LoyaltyTier = 'MEMBER';
  if (points >= LOYALTY_TIER_CONFIG.GOLD.minPoints) {
    tier = 'GOLD';
  } else if (points >= LOYALTY_TIER_CONFIG.SILVER.minPoints) {
    tier = 'SILVER';
  } else {
    tier = 'MEMBER';
  }

  const tierInfo = LOYALTY_TIER_CONFIG[tier];
  const isMaxTier = tier === 'GOLD';

  if (isMaxTier) {
    return {
      tier,
      tierInfo,
      totalPoints: points,
      nextTier: null,
      pointsToNextTier: 0,
      progressPercent: 100,
      isMaxTier: true,
    };
  }

  const nextTierKey = tierInfo.nextTier!;
  const nextTierPoints = LOYALTY_TIER_CONFIG[nextTierKey].minPoints;
  const currentTierBase = tierInfo.minPoints;

  const pointsInCurrentRange = points - currentTierBase;
  const rangeSpan = nextTierPoints - currentTierBase;
  const progressPercent = Math.min(100, Math.max(0, Math.round((pointsInCurrentRange / rangeSpan) * 100)));
  const pointsToNextTier = Math.max(0, nextTierPoints - points);

  return {
    tier,
    tierInfo,
    totalPoints: points,
    nextTier: nextTierKey,
    pointsToNextTier,
    progressPercent,
    isMaxTier: false,
  };
}

const API_GATEWAY_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8080';

export async function fetchAvailableVouchers(): Promise<Voucher[]> {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/promotions/vouchers/available`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Backend offline / network error: fallback smoothly to mock vouchers
  }
  return MOCK_AVAILABLE_VOUCHERS;
}

export interface MyLoyaltyResponse {
  points: MemberPoints;
  transactions: PointTransaction[];
  isGuest: boolean;
}

export async function fetchMyLoyalty(): Promise<MyLoyaltyResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('clucky_access_token') : null;
  if (!token) {
    // If not logged in, return fallback guest state or mock preview
    return {
      points: {
        customerId: '',
        totalPoints: 0,
        tier: 'MEMBER',
      },
      transactions: [],
      isGuest: true,
    };
  }

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/loyalty/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        points: data.points ?? {
          customerId: data.customerId ?? 'cus',
          totalPoints: data.totalPoints ?? 0,
          tier: data.tier ?? 'MEMBER',
        },
        transactions: data.transactions ?? [],
        isGuest: false,
      };
    }
  } catch {
    // Fallback to sample member points for preview
  }

  return {
    points: MOCK_MEMBER_POINTS,
    transactions: MOCK_POINT_TRANSACTIONS,
    isGuest: false,
  };
}

export function calculateEarnPoints(amount: number, earnRate = 10000): number {
  const safeAmount = Math.max(0, Number(amount) || 0);
  return Math.floor(safeAmount / earnRate);
}

export function calculatePointsDiscount(points: number, redeemRate = 1000): number {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  return safePoints * redeemRate;
}

