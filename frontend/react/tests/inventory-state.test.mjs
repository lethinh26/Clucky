import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stockState } from '../src/pages/Staff/Inventory/stock-state.ts';

test('inventory cards and filters agree about available, low and stopped items', () => {
  assert.deepEqual(stockState({ quantityAvailable: 20, isSoldOut: false }, 20), { soldOut: false, available: true, lowStock: true });
  assert.deepEqual(stockState({ quantityAvailable: 21, isSoldOut: false }, 20), { soldOut: false, available: true, lowStock: false });
  for (const item of [{ quantityAvailable: 0, isSoldOut: false }, { quantityAvailable: 5, isSoldOut: true }, { quantityAvailable: 50, isSoldOut: true }]) {
    assert.deepEqual(stockState(item, 20), { soldOut: true, available: false, lowStock: false });
  }
  assert.equal(stockState({ quantityAvailable: 1, isSoldOut: false }, 0).lowStock, false);
});
