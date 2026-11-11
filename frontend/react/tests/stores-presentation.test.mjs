import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesStoreSearch, readinessLabel, storeTime } from '../src/pages/Stores/presentation.ts';

test('store time picker preserves HH:mm and optional seconds without locale parsing', () => {
  for (const value of ['00:00', '02:00', '09:30', '23:59', '22:30:00']) {
    assert.equal(storeTime(value)?.format('HH:mm'), value.slice(0, 5));
  }
  for (const value of ['', null, undefined, '24:00', '09:60', '1:30', '09:00:99']) assert.equal(storeTime(value), null);
});

test('branch filtering supports Vietnamese names, address and hotline', () => {
  assert.ok(matchesStoreSearch(['Clucky Đống Đa', '128 Lê Lợi', null], '  dong da '));
  assert.ok(matchesStoreSearch(['02873001234', undefined], '7300'));
  assert.equal(matchesStoreSearch(['Quận 1'], 'quan 12'), false);
  assert.equal(readinessLabel('READY'), 'Sẵn sàng');
  assert.equal(readinessLabel('UNPROVISIONED'), 'Chưa có tài khoản');
  assert.equal(readinessLabel('UNEXPECTED'), 'Chưa xác định');
});
