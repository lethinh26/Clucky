import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegalRequestScope } from '../src/pages/Legal/legal-request-scope.ts';

test('late terms response never overwrites privacy draft after switching tabs', () => {
  const guard = new LegalRequestScope('TERMS_OF_SERVICE');
  const termsRequest = guard.start('TERMS_OF_SERVICE');
  assert.ok(guard.current(termsRequest, 'TERMS_OF_SERVICE'));

  guard.activate('PRIVACY_POLICY');
  assert.equal(guard.current(termsRequest, 'TERMS_OF_SERVICE'), false);
  const privacyRequest = guard.start('PRIVACY_POLICY');
  assert.equal(guard.current(privacyRequest, 'PRIVACY_POLICY'), true);
  assert.equal(guard.current(privacyRequest, 'TERMS_OF_SERVICE'), false);
});

test('later same-document reload supersedes earlier response and cleanup rejects stale results', () => {
  const guard = new LegalRequestScope('TERMS_OF_SERVICE');
  const first = guard.start('TERMS_OF_SERVICE');
  const second = guard.start('TERMS_OF_SERVICE');
  assert.equal(guard.current(first, 'TERMS_OF_SERVICE'), false);
  assert.equal(guard.current(second, 'TERMS_OF_SERVICE'), true);
  guard.invalidate();
  assert.equal(guard.current(second, 'TERMS_OF_SERVICE'), false);
});
