import { getTranslator } from "./i18n/translator.ts";
import { getBrowserLocale, type Locale } from "./i18n/locale.ts";
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
} from './mock/promotion-mock-data.ts';

export {
  MOCK_AVAILABLE_VOUCHERS,
  MOCK_MEMBER_POINTS,
  MOCK_POINT_TRANSACTIONS,
  MOCK_LOYALTY_CONFIG,
};

export function getLoyaltyTierConfig(locale: Locale = getBrowserLocale()): Record<LoyaltyTier, LoyaltyTierInfo> {
  const t = getTranslator(locale);
  return {
    MEMBER: {
      tier: 'MEMBER',
      label: t("business.promotionUi.memberLabel"),
      minPoints: 0,
      discountPercent: 0,
      badgeColor: '#A16207',
      benefits: [
        t("business.promotionUi.earnBenefit"),
        t("business.promotionUi.redeemBenefit"),
        t("business.promotionUi.weeklyBenefit"),
      ],
      nextTier: 'SILVER',
      nextTierPoints: 1000,
    },
    SILVER: {
      tier: 'SILVER',
      label: t("business.promotionUi.silverLabel"),
      minPoints: 1000,
      discountPercent: 3,
      badgeColor: '#64748B',
      benefits: [
        t("business.promotionUi.silverBill"),
        t("business.promotionUi.birthdayBenefit"),
        t("business.promotionUi.priorityBenefit"),
      ],
      nextTier: 'GOLD',
      nextTierPoints: 5000,
    },
    GOLD: {
      tier: 'GOLD',
      label: t("business.promotionUi.goldLabel"),
      minPoints: 5000,
      discountPercent: 5,
      badgeColor: '#D97706',
      benefits: [
        t("business.promotionUi.goldBill"),
        t("business.promotionUi.supportBenefit"),
        t("business.promotionUi.giftBenefit"),
      ],
      nextTier: null,
      nextTierPoints: null,
    },
  };
}

export const LOYALTY_TIER_CONFIG = getLoyaltyTierConfig("vi");

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
  maxDiscount?: number | null,
  locale: Locale = getBrowserLocale()
): string {
  const t = getTranslator(locale);
  const safeValue = Math.max(0, Number(value) || 0);
  if (type === 'PERCENT') {
    const percentText = t("business.promotionUi.discountPercent", { value: safeValue });
    if (maxDiscount && maxDiscount > 0) {
      return t("business.promotionUi.discountCapped", { discount: percentText, amount: maxDiscount.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) });
    }
    return percentText;
  }
  return t("business.promotionUi.discountAmount", { amount: safeValue.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) });
}

export function formatVoucherCondition(
  minOrderAmount: number,
  maxDiscount?: number | null,
  type?: VoucherType,
  locale: Locale = getBrowserLocale()
): string {
  const t = getTranslator(locale);
  const safeMin = Math.max(0, Number(minOrderAmount) || 0);
  const parts: string[] = [];

  if (safeMin > 0) {
    parts.push(t("business.promotionUi.minimumOrder", { amount: safeMin.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) }));
  } else {
    parts.push(t("business.promotionUi.anyAmount"));
  }

  if (type === 'PERCENT' && maxDiscount && maxDiscount > 0) {
    parts.push(t("business.promotionUi.maximumDiscount", { amount: maxDiscount.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) }));
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
  now = new Date(),
  locale: Locale = getBrowserLocale()
): VoucherValidationResult {
  const t = getTranslator(locale);
  if (!voucher || !voucher.code) {
    return { valid: false, discountAmount: 0, reason: t("business.promotionUi.unknownVoucher") };
  }

  const status = getVoucherStatus(voucher, now);
  if (status === 'EXPIRED') {
    return { valid: false, discountAmount: 0, reason: t("business.promotionUi.expiredVoucher") };
  }
  if (status === 'UPCOMING') {
    return { valid: false, discountAmount: 0, reason: t("business.promotionUi.upcomingVoucher") };
  }
  if (status === 'EXHAUSTED') {
    return { valid: false, discountAmount: 0, reason: t("business.promotionUi.exhaustedVoucher") };
  }
  if (status === 'DISABLED') {
    return { valid: false, discountAmount: 0, reason: t("business.promotionUi.disabledVoucher") };
  }

  // Validate Store Scope
  if (voucher.scope === 'STORE') {
    if (!voucher.storeId) {
      return { valid: false, discountAmount: 0, reason: t("business.promotionUi.invalidStoreVoucher") };
    }
    if (storeId && String(voucher.storeId) !== String(storeId)) {
      const storeNotice = voucher.storeName
        ? t("business.promotionUi.storeOnly", { store: voucher.storeName })
        : t("business.promotionUi.wrongStore");
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
      reason: t("business.promotionUi.minimumMissing", { minimum: minRequired.toLocaleString(
        (locale === 'en' ? 'en-US' : 'vi-VN')
      ), missing: missing.toLocaleString((locale === 'en' ? 'en-US' : 'vi-VN')) }),
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

export function calculateTierProgress(pointsInput: number, locale: Locale = getBrowserLocale()): TierProgressResult {
  const LOYALTY_TIER_CONFIG = getLoyaltyTierConfig(locale);
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

export async function fetchAvailableVouchers(): Promise<Voucher[]> {
  try {
    const { default: request } = await import("./api");
    const data = await request<Voucher[]>("/api/promotions/vouchers/available");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export interface MyLoyaltyResponse {
  points: MemberPoints;
  transactions: PointTransaction[];
  isGuest: boolean;
}

export async function fetchMyLoyalty(): Promise<MyLoyaltyResponse> {
  const { default: request } = await import("./api");
  const { loadSession } = await import("./session");
  const user = await loadSession();
  if (!user) {
    return {
      points: { customerId: '', totalPoints: 0, tier: 'MEMBER' },
      transactions: [],
      isGuest: true,
    };
  }
  try {
    const data = await request<{ points?: MemberPoints; transactions?: PointTransaction[]; totalPoints?: number; tier?: LoyaltyTier }>("/api/loyalty/me");
    return {
      points: data.points ?? {
        customerId: String(user.userId),
        totalPoints: Number(data.totalPoints) || 0,
        tier: data.tier ?? 'MEMBER',
      },
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      isGuest: false,
    };
  } catch {
    return {
      points: { customerId: String(user.userId), totalPoints: 0, tier: 'MEMBER' },
      transactions: [],
      isGuest: false,
    };
  }
}

export function calculateEarnPoints(amount: number, earnRate = 10000): number {
  const safeAmount = Math.max(0, Number(amount) || 0);
  return Math.floor(safeAmount / earnRate);
}

export function calculatePointsDiscount(points: number, redeemRate = 1000): number {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  return safePoints * redeemRate;
}
