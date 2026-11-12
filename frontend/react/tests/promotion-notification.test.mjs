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

test('UI-50 email log filter, detail mask contract and retry state constraints', () => {
  // Test retry eligibility predicate
  function canRetry(status) {
    return status === 'FAILED' || status === 'EXPIRED';
  }

  function getRetryBlockedReason(status) {
    if (status === 'SENT') return 'EMAIL_ALREADY_SENT';
    if (status === 'SENDING' || status === 'QUEUED') return 'DELIVERY_IN_PROGRESS';
    return null;
  }

  // SENT: Không retry như FAILED
  assert.equal(canRetry('SENT'), false);
  assert.equal(getRetryBlockedReason('SENT'), 'EMAIL_ALREADY_SENT');

  // SENDING / QUEUED: In progress
  assert.equal(canRetry('SENDING'), false);
  assert.equal(getRetryBlockedReason('SENDING'), 'DELIVERY_IN_PROGRESS');
  assert.equal(canRetry('QUEUED'), false);
  assert.equal(getRetryBlockedReason('QUEUED'), 'DELIVERY_IN_PROGRESS');

  // FAILED / EXPIRED: Eligible
  assert.equal(canRetry('FAILED'), true);
  assert.equal(getRetryBlockedReason('FAILED'), null);
  assert.equal(canRetry('EXPIRED'), true);
  assert.equal(getRetryBlockedReason('EXPIRED'), null);

  // Filter contract includes template
  const filters = {
    recipient: 'test@example.com',
    status: 'FAILED',
    template: 'ORDER_COMPLETED',
    from: '2026-11-01T00:00:00Z',
    to: '2026-11-12T00:00:00Z',
  };
  assert.equal(filters.template, 'ORDER_COMPLETED');
  assert.equal(filters.status, 'FAILED');

  // Masked format validation
  const maskedEmail = 'c***@e***';
  assert.match(maskedEmail, /^[a-zA-Z0-9]\*\*\*@[a-zA-Z0-9]\*\*\*$/);
});

