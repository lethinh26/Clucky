import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogItemPath, historyReason, orderDate, paymentColor, snapshotLabels } from '../src/pages/Orders/presentation.ts';

test('order images resolve by item type and identifier, never by name or array position', () => {
  assert.equal(catalogItemPath({ itemType: 'PRODUCT', productId: 7, comboId: 9 }), '/api/catalog/products/7');
  assert.equal(catalogItemPath({ itemType: 'COMBO', productId: 7, comboId: 9 }), '/api/catalog/combos/9');
  for (const productId of [undefined, 0, -1, 1.5, '7', NaN, Infinity]) assert.equal(catalogItemPath({ itemType: 'PRODUCT', productId }), undefined);
  assert.equal(catalogItemPath({ itemType: 'UNKNOWN', productId: 7 }), undefined);
});

test('history translates system messages while retaining cancellation reasons written by users', () => {
  assert.equal(historyReason('Order created with payment method: BANK_TRANSFER'), 'Đặt đơn · Chuyển khoản ngân hàng');
  assert.equal(historyReason('PAYMENT_EXPIRED'), 'Quá thời hạn thanh toán. Hệ thống tự động hủy đơn.');
  assert.equal(historyReason('Khách yêu cầu hủy'), 'Khách yêu cầu hủy');
  assert.equal(historyReason('CANCELLED', 'CANCELLED'), '');
  assert.equal(historyReason(undefined), '');
  assert.equal(paymentColor('PENDING'), 'gold');
  assert.equal(paymentColor('PAID'), 'success');
  assert.equal(paymentColor('EXPIRED'), 'error');
});

test('snapshot presentation uses order-time names and never displays raw JSON or malformed values', () => {
  assert.deepEqual(snapshotLabels([{ groupName: 'Vị', name: 'Cay' }, { name: 'Phô mai', quantity: 2 }, null, { id: 42 }]), ['Vị: Cay', 'Phô mai × 2']);
  assert.deepEqual(snapshotLabels({ name: 'Not an array' }), []);
  assert.equal(orderDate('invalid'), '—');
  assert.match(orderDate('2026-11-09T13:02:00Z'), /20:02/);
});
