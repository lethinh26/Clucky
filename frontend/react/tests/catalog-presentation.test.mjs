import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCatalogImage, matchesCatalogSearch } from '../src/pages/Catalog/presentation.ts';

test('catalog search supports Vietnamese accents, case and whitespace without inventing matches', () => {
  assert.ok(matchesCatalogSearch(['Gà giòn', 'Đồ ăn kèm'], '  DO   AN KEM '));
  assert.ok(matchesCatalogSearch(['Combo gia đình', undefined], 'gia dinh'));
  assert.ok(matchesCatalogSearch(['Gà'], ''));
  assert.equal(matchesCatalogSearch(['Gà giòn'], 'burger'), false);
});

test('catalog upload accepts only supported nonempty images within the server limit', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.ok(isCatalogImage({ type, size: 5 * 1024 * 1024 }));
  }
  for (const size of [0, -1, NaN, Infinity, 5 * 1024 * 1024 + 1]) {
    assert.equal(isCatalogImage({ type: 'image/png', size }), false);
  }
  assert.equal(isCatalogImage({ type: 'image/svg+xml', size: 100 }), false);
});
