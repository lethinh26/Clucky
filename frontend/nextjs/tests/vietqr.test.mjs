import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVietQrUrl } from '../lib/vietqr.ts';

const bank = { bankCode: 'MB', bankName: 'MB Bank', accountNo: '0909123456789', accountName: 'CLUCKY VIETNAM' };

test('VietQR uses all requested parameters and preserves transfer amount and leading zeros', () => {
  const url = new URL(buildVietQrUrl({ bank, amount: 262000, description: 'CLU-240826', storeName: 'Clucky Nguyễn Trãi' }));
  assert.equal(url.origin + url.pathname, 'https://img.vietqr.io/image/MB-0909123456789-compact2.png');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    amount: '262000', addInfo: 'CLU240826', accountName: 'CLUCKY VIETNAM',
  });
});

test('VietQR safely encodes accented names and query delimiters', () => {
  const url = new URL(buildVietQrUrl({ bank: {...bank, accountName: 'Tên & Chủ + TK'}, amount: 123456, description: 'ĐƠN & amount=1', storeName: 'Cửa hàng #1?' }));
  assert.equal(url.searchParams.get('amount'), '123456');
  assert.equal(url.searchParams.get('addInfo'), 'DONamount1');
  assert.equal(url.searchParams.get('accountName'), 'Tên & Chủ + TK');
});

test('VietQR never rounds an invalid amount or generates a QR with incomplete bank data', () => {
  for (const amount of [NaN, Infinity, -100, 0, 100.5]) {
    assert.equal(buildVietQrUrl({ bank, amount, description: 'ORDER' }), null);
  }
  for (const field of ['bankCode', 'accountNo', 'accountName']) {
    assert.equal(buildVietQrUrl({ bank: {...bank, [field]: ' '}, amount: 100, description: 'ORDER' }), null);
  }
});
