import test from 'node:test';
import assert from 'node:assert/strict';
import { voucherState, voucherStoreName } from '../src/pages/Promotions/presentation.ts';

test('pending proposals require approval rather than reactivation', () => {
  const pending = voucherState({ status: 'PENDING_APPROVAL', scope: 'STORE' });
  assert.equal(pending.status, 'PENDING_APPROVAL');
  assert.equal(pending.canApprove, true);
  assert.equal(pending.canToggle, false);
  assert.equal(pending.isProposal, true);
  assert.equal(voucherState({ status: 'REJECTED', scope: 'STORE' }).isProposal, true);
  assert.equal(voucherState({ status: 'ACTIVE', scope: 'STORE' }).isProposal, false);
  assert.equal(voucherState({ status: 'REJECTED', scope: 'STORE' }).canToggle, false);
  assert.equal(voucherState({ status: 'DISABLED', scope: 'STORE' }).canToggle, true);
  assert.equal(voucherState({ status: 'ACTIVE', effectiveStatus: 'UPCOMING', scope: 'STORE' }).status, 'UPCOMING');
  assert.equal(voucherState({ status: 'PENDING_APPROVAL', scope: 'ALL' }).canApprove, false);
  assert.equal(voucherState({ status: 'UNRECOGNIZED', scope: 'STORE' }).status, 'UNKNOWN');
});

test('store IDs resolve to real names without invented branch labels', () => {
  assert.equal(voucherStoreName({ storeId: '1' }, [{ id: 1, name: 'Clucky Quận 1' }]), 'Clucky Quận 1');
  assert.equal(voucherStoreName({ storeId: 1, storeName: 'Tên cũ' }, [{ id: 1, name: 'Tên mới' }]), 'Tên mới');
  assert.equal(voucherStoreName({ storeId: 9 }, []), undefined);
});
