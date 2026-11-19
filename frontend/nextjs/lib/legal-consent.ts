import type { LegalConsentInput, PublicLegalDocument } from './api';

/** A client convenience only; identity-service always validates published versions itself. */
export function consentForPublished(
  terms: PublicLegalDocument | null,
  privacy: PublicLegalDocument | null,
  accepted: boolean,
): LegalConsentInput | null {
  if (!accepted || terms?.type !== 'TERMS_OF_SERVICE' || privacy?.type !== 'PRIVACY_POLICY'
      || !Number.isSafeInteger(terms.version) || terms.version <= 0
      || !Number.isSafeInteger(privacy.version) || privacy.version <= 0) return null;
  return { accepted: true, termsVersion: terms.version, privacyVersion: privacy.version };
}
