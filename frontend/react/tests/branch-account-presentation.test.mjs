import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountRole, accountReadiness } from '../src/pages/Users/branch-account-presentation.ts';

test('missing and unactivated accounts are never presented as ready or as needing manual migration', () => {
  assert.equal(accountReadiness('UNPROVISIONED'), 'Chưa có tài khoản');
  assert.equal(accountReadiness('PROVISIONED'), 'Chờ kích hoạt');
  assert.equal(accountReadiness('READY'), 'Sẵn sàng sử dụng');
  assert.equal(accountReadiness(undefined), 'Chưa xác định');
  assert.equal(accountRole('STORE_MANAGER'), 'Quản lý chi nhánh');
  assert.equal(accountRole('STAFF'), 'Tài khoản tác nghiệp');
});
