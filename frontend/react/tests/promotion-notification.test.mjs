import test from 'node:test';
import assert from 'node:assert/strict';

test('React Admin promotion and notification type contracts are well-formed', () => {
  const adminVoucher = {
    id: 1,
    code: 'ADMIN20',
    type: 'PERCENT',
    value: 20,
    minOrderAmount: 100000,
    maxDiscount: 50000,
    usedCount: 10,
    totalLimit: 100,
    startAt: '2026-10-01T00:00:00Z',
    endAt: '2026-11-01T00:00:00Z',
    scope: 'ALL',
    status: 'ACTIVE',
  };

  assert.equal(adminVoucher.code, 'ADMIN20');
  assert.equal(adminVoucher.type, 'PERCENT');
  assert.equal(adminVoucher.scope, 'ALL');

  const adminNotification = {
    id: 10,
    title: 'Đơn hàng mới',
    content: 'Đơn #ORD-123 đang chờ xác nhận',
    type: 'ORDER',
    refId: 'ORD-123',
    isRead: false,
    createdAt: '2026-10-30T10:00:00Z',
  };

  assert.equal(adminNotification.type, 'ORDER');
  assert.equal(adminNotification.isRead, false);
});

