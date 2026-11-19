import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consentForPublished } from '../lib/legal-consent.ts';

const terms = { type: 'TERMS_OF_SERVICE', version: 7 };
const privacy = { type: 'PRIVACY_POLICY', version: 4 };

test('phone and Google registration require explicit acknowledgement of both public document revisions', () => {
  assert.equal(consentForPublished(terms, privacy, false), null);
  assert.equal(consentForPublished(terms, null, true), null);
  assert.equal(consentForPublished(null, privacy, true), null);
  assert.deepEqual(consentForPublished(terms, privacy, true),
    { accepted: true, termsVersion: 7, privacyVersion: 4 });
});

test('consent widget rejects wrong type, invalid or nonpositive revision numbers', () => {
  assert.equal(consentForPublished(privacy, terms, true), null);
  assert.equal(consentForPublished({ ...terms, version: 0 }, privacy, true), null);
  assert.equal(consentForPublished(terms, { ...privacy, version: 1.5 }, true), null);
});
