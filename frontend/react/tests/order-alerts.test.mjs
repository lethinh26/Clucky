import test from 'node:test';
import assert from 'node:assert/strict';
import { incomingOrders } from '../src/lib/order-alerts.ts';

test('order alerts detect unseen rows even if preparation starts between polls', () => {
  const seen = new Set(['1']);
  const orders = [{ id: 1, status: 'READY' }, { id: 2, status: 'PENDING_PAYMENT' }, { id: 3, status: 'PREPARING' }, { id: 4, status: 'CANCELLED' }];
  assert.deepEqual(incomingOrders(orders, seen).map(order => order.id), [2, 3]);
  orders.forEach(order => seen.add(String(order.id)));
  assert.deepEqual(incomingOrders(orders, seen), []);
});
