import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVoucherStatus,
  formatVoucherDiscount,
  formatVoucherCondition,
  validateVoucherForOrder,
  calculateTierProgress,
  getLoyaltyTierConfig,
  LOYALTY_TIER_CONFIG,
} from '../lib/promotion.ts';
import {
  formatRelativeTime,
  markNotificationReadLocal,
  markAllNotificationsReadLocal,
  deleteNotificationLocal,
  NOTIFICATION_TYPE_CONFIG,
  resolveNotificationTarget,
} from '../lib/notification.ts';

test('notification targets use the actual order and reject external or executable links', () => {
  for (const type of ['ORDER', 'PAYMENT']) {
    assert.equal(resolveNotificationTarget({ type, refId: 999999 }, 'vi').url, '/orders/999999');
  }
  for (const link of ['javascript:alert(1)', '//outside.example', 'https://outside.example', '/\\outside.example']) {
    assert.equal(resolveNotificationTarget({ type: 'ORDER', refId: 42, link }, 'vi').isValid, false);
  }
  assert.equal(resolveNotificationTarget({ type: 'ORDER', link: '/orders/42' }, 'vi').url, '/orders/42');
});

// -------------------------------------------------------------
// VOUCHER TESTS
// -------------------------------------------------------------
test('promotion and notification helpers follow the requested locale', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  assert.equal(formatVoucherDiscount('PERCENT', 15, 50000, 'en'), 'Save 15% (up to VND 50,000)');
  assert.equal(formatVoucherCondition(150000, 50000, 'PERCENT', 'en'), 'Orders from VND 150,000 • up to VND 50,000');
  assert.equal(formatRelativeTime('2026-10-30T11:45:00Z', now, 'en'), '15 minutes ago');
  assert.equal(getLoyaltyTierConfig('en').SILVER.label, 'Silver Member');
  assert.equal(getLoyaltyTierConfig('vi').SILVER.label, 'Thành viên Bạc');
  assert.equal(calculateTierProgress(1000, 'en').tierInfo.label, 'Silver Member');
});

test('formatVoucherDiscount formats percentage and amount correctly', () => {
  assert.equal(formatVoucherDiscount('PERCENT', 20), 'Giảm 20%');
  assert.equal(
    formatVoucherDiscount('PERCENT', 15, 50000),
    'Giảm 15% (tối đa 50.000đ)'
  );
  assert.equal(formatVoucherDiscount('AMOUNT', 30000), 'Giảm 30.000đ');
  // Defensive edge cases
  assert.equal(formatVoucherDiscount('PERCENT', -10), 'Giảm 0%');
  assert.equal(formatVoucherDiscount('AMOUNT', 0), 'Giảm 0đ');
});

test('formatVoucherCondition formats minimum spend and cap', () => {
  assert.equal(
    formatVoucherCondition(150000, 50000, 'PERCENT'),
    'Đơn từ 150.000đ • tối đa 50.000đ'
  );
  assert.equal(formatVoucherCondition(0), 'Mọi giá trị đơn');
  assert.equal(formatVoucherCondition(100000), 'Đơn từ 100.000đ');
});

test('getVoucherStatus identifies active, expired, upcoming, and exhausted states', () => {
  const now = new Date('2026-10-30T10:00:00Z');

  const activeVoucher = {
    code: 'ACTIVE10',
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    totalLimit: 100,
    usedCount: 20,
    status: 'ACTIVE',
  };
  assert.equal(getVoucherStatus(activeVoucher, now), 'ACTIVE');

  const expiredVoucher = {
    code: 'OLDVOUCHER',
    startAt: '2026-09-01T00:00:00Z',
    endAt: '2026-10-15T00:00:00Z',
    status: 'ACTIVE',
  };
  assert.equal(getVoucherStatus(expiredVoucher, now), 'EXPIRED');

  const upcomingVoucher = {
    code: 'FUTURISTIC',
    startAt: '2026-11-15T00:00:00Z',
    endAt: '2026-12-01T00:00:00Z',
    status: 'ACTIVE',
  };
  assert.equal(getVoucherStatus(upcomingVoucher, now), 'UPCOMING');

  const exhaustedVoucher = {
    code: 'LIMITED',
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    totalLimit: 50,
    usedCount: 50,
    status: 'ACTIVE',
  };
  assert.equal(getVoucherStatus(exhaustedVoucher, now), 'EXHAUSTED');

  const disabledVoucher = {
    code: 'LOCKED',
    status: 'DISABLED',
  };
  assert.equal(getVoucherStatus(disabledVoucher, now), 'DISABLED');
});

test('validateVoucherForOrder enforces min order amount and applies discount cap', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  const percentVoucher = {
    id: 1,
    code: 'DISCOUNT20',
    type: 'PERCENT',
    value: 20,
    minOrderAmount: 200000,
    maxDiscount: 50000,
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    totalLimit: 100,
    usedCount: 5,
    scope: 'ALL',
    status: 'ACTIVE',
  };

  // 1. Order below min amount
  const failResult = validateVoucherForOrder(percentVoucher, 150000, null, now);
  assert.equal(failResult.valid, false);
  assert.equal(failResult.discountAmount, 0);
  assert.match(failResult.reason, /chưa đạt mức tối thiểu/);

  // 2. Order meets min amount, 20% of 200,000 is 40,000 (under 50,000 cap)
  const passResult1 = validateVoucherForOrder(percentVoucher, 200000, null, now);
  assert.equal(passResult1.valid, true);
  assert.equal(passResult1.discountAmount, 40000);

  // 3. Large order: 20% of 500,000 is 100,000 -> capped at 50,000
  const passResult2 = validateVoucherForOrder(percentVoucher, 500000, null, now);
  assert.equal(passResult2.valid, true);
  assert.equal(passResult2.discountAmount, 50000);

  // 4. Fixed amount voucher
  const fixedVoucher = {
    id: 2,
    code: 'FIXED30K',
    type: 'AMOUNT',
    value: 30000,
    minOrderAmount: 100000,
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    scope: 'ALL',
    usedCount: 0,
    status: 'ACTIVE',
  };
  const fixedResult = validateVoucherForOrder(fixedVoucher, 150000, null, now);
  assert.equal(fixedResult.valid, true);
  assert.equal(fixedResult.discountAmount, 30000);
});

test('validateVoucherForOrder checks store scope isolation', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  const storeVoucher = {
    id: 3,
    code: 'STOREONLY',
    type: 'AMOUNT',
    value: 20000,
    minOrderAmount: 50000,
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    scope: 'STORE',
    storeId: 'store-101',
    storeName: 'Clucky Cầu Giấy',
    usedCount: 0,
    status: 'ACTIVE',
  };

  // Different store
  const mismatchResult = validateVoucherForOrder(storeVoucher, 100000, 'store-999', now);
  assert.equal(mismatchResult.valid, false);
  assert.match(mismatchResult.reason, /Clucky Cầu Giấy/);

  // Matching store
  const matchResult = validateVoucherForOrder(storeVoucher, 100000, 'store-101', now);
  assert.equal(matchResult.valid, true);
  assert.equal(matchResult.discountAmount, 20000);
});

// -------------------------------------------------------------
// LOYALTY TIER TESTS
// -------------------------------------------------------------
test('calculateTierProgress accurately calculates tier progression', () => {
  // 1. Member base (0 points)
  const p0 = calculateTierProgress(0);
  assert.equal(p0.tier, 'MEMBER');
  assert.equal(p0.nextTier, 'SILVER');
  assert.equal(p0.pointsToNextTier, 1000);
  assert.equal(p0.progressPercent, 0);
  assert.equal(p0.isMaxTier, false);

  // 2. Member mid-range (400 points -> 40%)
  const p400 = calculateTierProgress(400);
  assert.equal(p400.tier, 'MEMBER');
  assert.equal(p400.nextTier, 'SILVER');
  assert.equal(p400.pointsToNextTier, 600);
  assert.equal(p400.progressPercent, 40);

  // 3. Silver tier (1000 points)
  const p1000 = calculateTierProgress(1000);
  assert.equal(p1000.tier, 'SILVER');
  assert.equal(p1000.nextTier, 'GOLD');
  assert.equal(p1000.pointsToNextTier, 4000);
  assert.equal(p1000.progressPercent, 0);

  // 4. Silver tier mid-range (3000 points -> 2000 / 4000 = 50%)
  const p3000 = calculateTierProgress(3000);
  assert.equal(p3000.tier, 'SILVER');
  assert.equal(p3000.nextTier, 'GOLD');
  assert.equal(p3000.pointsToNextTier, 2000);
  assert.equal(p3000.progressPercent, 50);

  // 5. Gold tier threshold (5000 points -> Max tier)
  const p5000 = calculateTierProgress(5000);
  assert.equal(p5000.tier, 'GOLD');
  assert.equal(p5000.nextTier, null);
  assert.equal(p5000.pointsToNextTier, 0);
  assert.equal(p5000.progressPercent, 100);
  assert.equal(p5000.isMaxTier, true);

  // 6. Gold tier exceeding threshold (15,000 points)
  const p15000 = calculateTierProgress(15000);
  assert.equal(p15000.tier, 'GOLD');
  assert.equal(p15000.isMaxTier, true);
  assert.equal(p15000.progressPercent, 100);

  // 7. Defensive: negative points or NaN clamps safely to 0
  assert.equal(calculateTierProgress(-50).totalPoints, 0);
  assert.equal(calculateTierProgress('invalid').totalPoints, 0);
});

test('LOYALTY_TIER_CONFIG has valid benefits and discount percent for all tiers', () => {
  assert.equal(LOYALTY_TIER_CONFIG.MEMBER.discountPercent, 0);
  assert.equal(LOYALTY_TIER_CONFIG.SILVER.discountPercent, 3);
  assert.equal(LOYALTY_TIER_CONFIG.GOLD.discountPercent, 5);
  assert.ok(LOYALTY_TIER_CONFIG.MEMBER.benefits.length > 0);
  assert.ok(LOYALTY_TIER_CONFIG.SILVER.benefits.length > 0);
  assert.ok(LOYALTY_TIER_CONFIG.GOLD.benefits.length > 0);
});

// -------------------------------------------------------------
// NOTIFICATION TESTS
// -------------------------------------------------------------
test('formatRelativeTime formats time differences accurately', () => {
  const baseTime = new Date('2026-10-30T12:00:00Z');

  // Just now (< 60s)
  assert.equal(
    formatRelativeTime('2026-10-30T11:59:30Z', baseTime),
    'Vừa xong'
  );

  // Minutes ago
  assert.equal(
    formatRelativeTime('2026-10-30T11:45:00Z', baseTime),
    '15 phút trước'
  );

  // Hours ago
  assert.equal(
    formatRelativeTime('2026-10-30T09:00:00Z', baseTime),
    '3 giờ trước'
  );

  // Days ago (< 7 days)
  assert.equal(
    formatRelativeTime('2026-10-28T12:00:00Z', baseTime),
    '2 ngày trước'
  );

  // Date format for >= 7 days
  const oldDate = formatRelativeTime('2026-10-01T12:00:00Z', baseTime);
  assert.match(oldDate, /01\/10\/2026/);

  // Empty / invalid input fallback
  assert.equal(formatRelativeTime(''), 'Gần đây');
  assert.equal(formatRelativeTime('invalid-date'), 'Gần đây');
});

test('markNotificationReadLocal, markAllNotificationsReadLocal and deleteNotificationLocal operate immutably', () => {
  const sampleNotifications = [
    { id: 1, title: 'Đơn mới', content: 'Chi tiết đơn', type: 'ORDER', isRead: false, createdAt: '2026-10-30T10:00:00Z' },
    { id: 2, title: 'Khuyến mãi', content: 'Giảm 20%', type: 'PROMOTION', isRead: false, createdAt: '2026-10-30T09:00:00Z' },
  ];

  // 1. Mark single notification as read
  const updated1 = markNotificationReadLocal(sampleNotifications, 1);
  assert.equal(updated1[0].isRead, true);
  assert.equal(updated1[1].isRead, false);
  // Source is preserved (immutability)
  assert.equal(sampleNotifications[0].isRead, false);

  // 2. Mark all as read
  const allRead = markAllNotificationsReadLocal(sampleNotifications);
  assert.ok(allRead.every((n) => n.isRead === true));

  // 3. Delete notification
  const remaining = deleteNotificationLocal(sampleNotifications, 1);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 2);
});

test('NOTIFICATION_TYPE_CONFIG provides valid metadata for all four domain types', () => {
  const types = ['ORDER', 'PAYMENT', 'PROMOTION', 'SYSTEM'];
  for (const t of types) {
    const config = NOTIFICATION_TYPE_CONFIG[t];
    assert.ok(config, `Missing config for ${t}`);
    assert.ok(config.label, `Missing label for ${t}`);
    assert.ok(config.iconName, `Missing icon for ${t}`);
    assert.ok(config.badgeClass, `Missing badgeClass for ${t}`);
  }
});

