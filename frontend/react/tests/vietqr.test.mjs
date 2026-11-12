import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVietQrUrl } from '../src/lib/vietqr.ts';

const bank = { bankName: 'Configured Bank', bankCode: '970422', accountNo: '00123456789', accountName: 'CLUCKY & STORE' };

test('bank and split QRs preserve the backend reference and real receiving account', () => {
  for (const amount of [10000, 5000]) {
    const url = new URL(buildVietQrUrl(bank, amount, 'CLU20261112W27G'));
    assert.equal(url.pathname, '/image/970422-00123456789-qr_only.svg');
    assert.equal(url.searchParams.get('addInfo'), 'CLU20261112W27G');
    assert.equal(url.searchParams.get('amount'), String(amount));
    assert.equal(url.searchParams.get('accountName'), bank.accountName);
  }
});

test('missing bank details and invalid references never fall back to a sample account', () => {
  assert.equal(buildVietQrUrl(null, 10000, 'ORDER1'), null);
  for (const field of ['bankCode', 'accountNo', 'accountName']) {
    assert.equal(buildVietQrUrl({ ...bank, [field]: '' }, 10000, 'ORDER1'), null);
  }
  for (const reference of ['', 'ORDER-1', 'ORDER1 SPLIT', 'ORDER&amount=1']) {
    assert.equal(buildVietQrUrl(bank, 10000, reference), null);
  }
  for (const amount of [0, -1, 1.5, NaN, Infinity]) assert.equal(buildVietQrUrl(bank, amount, 'ORDER1'), null);
});
