import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVietQrUrl } from '../lib/vietqr.ts';

const bank = { bankCode: 'MB', bankName: 'MB Bank', accountNo: '0909123456789', accountName: 'CLUCKY VIETNAM' };

test('VietQR uses all requested parameters and preserves transfer amount and leading zeros', () => {
  const url = new URL(buildVietQrUrl({ bank, amount: 262000, description: 'CLU-240826', storeName: 'Clucky Nguyễn Trãi' }));
  assert.equal(url.origin + url.pathname, 'https://vietqr.app/img');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    acc: '0909123456789', bank: 'MB', amount: '262000', des: 'CLU240826',
    template: 'qr_only', download: 'false', showinfo: 'false', fullacc: 'true',
    holder: 'CLUCKY VIETNAM', store: 'Clucky Nguyễn Trãi',
  });
});

test('VietQR safely encodes accented names and query delimiters', () => {
  const url = new URL(buildVietQrUrl({ bank: {...bank, accountName: 'Tên & Chủ + TK'}, amount: 123456, description: 'ĐƠN & amount=1', storeName: 'Cửa hàng #1?' }));
  assert.equal(url.searchParams.get('amount'), '123456');
  assert.equal(url.searchParams.get('des'), 'DONamount1');
  assert.equal(url.searchParams.get('holder'), 'Tên & Chủ + TK');
  assert.equal(url.searchParams.get('store'), 'Cửa hàng #1?');
});

test('VietQR never rounds an invalid amount or generates a QR with incomplete bank data', () => {
  for (const amount of [NaN, Infinity, -100, 0, 100.5]) {
    assert.equal(buildVietQrUrl({ bank, amount, description: 'ORDER' }), null);
  }
  for (const field of ['bankCode', 'accountNo', 'accountName']) {
    assert.equal(buildVietQrUrl({ bank: {...bank, [field]: ' '}, amount: 100, description: 'ORDER' }), null);
  }
});
