import test from 'node:test';
import assert from 'node:assert/strict';
import { posUnavailableReason } from '../src/lib/pos-availability.ts';

test('POS retains distinct server availability reasons and combo schedule boundaries', () => {
  assert.equal(posUnavailableReason({ isActive: false }), 'inactive');
  assert.equal(posUnavailableReason({ isSoldOut: true }), 'soldOut');
  assert.equal(posUnavailableReason({ isAvailable: false }), 'branchDisabled');
  const now = Date.parse('2026-11-13T05:00:00Z');
  assert.equal(posUnavailableReason({ startAt: '2026-11-14T05:00:00Z' }, now), 'notStarted');
  assert.equal(posUnavailableReason({ endAt: '2026-11-13T05:00:00Z' }, now), 'expired');
  assert.equal(posUnavailableReason({ isActive: true, isAvailable: true, isSoldOut: false }), undefined);
});
