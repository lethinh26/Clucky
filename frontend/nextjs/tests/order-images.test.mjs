import test from 'node:test';
import assert from 'node:assert/strict';
import { fillOrderImages } from '../lib/order-images.ts';

test('order images distinguish product and combo IDs without replacing snapshots', () => {
  const orders = [{ id: 'order', items: [
    { itemType: 'PRODUCT', productId: 7, image: '/images/food-placeholder.svg', unitPrice: 105000 },
    { itemType: 'COMBO', comboId: 7, image: '' },
    { itemType: 'PRODUCT', productId: 8, image: '/saved-snapshot.jpg' },
    { itemType: 'PRODUCT', productId: 99, image: '/images/food-placeholder.svg' },
  ] }];
  const result = fillOrderImages(orders, [
    { id: 7, imageUrl: '/chicken.jpg' },
    { id: 7, imageUrl: '/combo.jpg', comboItems: [] },
    { id: 8, imageUrl: '/new.jpg' },
  ]);
  assert.deepEqual(result[0].items.map(item => item.image), ['/chicken.jpg', '/combo.jpg', '/saved-snapshot.jpg', '/images/food-placeholder.svg']);
  assert.equal(result[0].items[0].unitPrice, 105000);
  assert.equal(orders[0].items[0].image, '/images/food-placeholder.svg');
  assert.equal(fillOrderImages(result, [])[0], result[0]);
});
