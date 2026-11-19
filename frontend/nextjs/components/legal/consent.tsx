"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { legalApi, type LegalConsentInput, type PublicLegalDocument } from "@/lib/api";
import { consentForPublished } from "@/lib/legal-consent";

export function useLegalConsent() {
  const [terms, setTerms] = useState<PublicLegalDocument | null>(null);
  const [privacy, setPrivacy] = useState<PublicLegalDocument | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [transitional, setTransitional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setAccepted(false);
    setTransitional(false);
    setError(false);
    try {
      const status = await legalApi.status();
      if (!status.consentRequired) {
        // Rollout-only compatibility mode: the backend does not record an
        // acceptance while enforcement is off. Never show a fake checkbox.
        setTransitional(true);
        setTerms(null);
        setPrivacy(null);
        return;
      }
      const [termsVersion, privacyVersion] = await Promise.all([
        legalApi.published("TERMS_OF_SERVICE"), legalApi.published("PRIVACY_POLICY"),
      ]);
      setTerms(termsVersion);
      setPrivacy(privacyVersion);
    } catch {
      setTerms(null); setPrivacy(null); setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const consent: LegalConsentInput | null = !loading && !error
    ? consentForPublished(terms, privacy, accepted) : null;
  return { terms, privacy, accepted, setAccepted, loading, error, transitional, consent, refresh };
}

type ConsentState = ReturnType<typeof useLegalConsent>;
export function ConsentField({ state, id }: { state: ConsentState; id: string }) {
  const t = useTranslations("legal");
  return <div className="my-4 rounded-xl border border-[#E8E2D9] bg-[#FFFAF3] p-4 text-sm leading-relaxed text-[#41352D]">
    {state.loading ? <p role="status">{t("loading")}</p> : state.error ? (
      <div role="alert" className="text-[#8F1216]">
        {t("unavailable")}{' '}
        <button type="button" onClick={() => void state.refresh()} className="underline">{t("reload")}</button>
      </div>
    ) : state.transitional ? <p role="status">{t("transitionNotice")}</p> : <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={state.accepted} onChange={e => state.setAccepted(e.target.checked)}
        required className="mt-1 h-4 w-4 shrink-0 accent-[#8F1216]" />
      <div>
        <label htmlFor={id} className="cursor-pointer font-semibold">{t("consentPrompt")}</label>{' '}
        <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-bold text-[#8F1216] underline">{t("terms")}</a>{' '}
        {t("and")}{' '}
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-bold text-[#8F1216] underline">{t("privacy")}</a>
        <div className="mt-1 text-xs text-[#76665B]">
          {t("version", { version: state.terms?.version })} / {t("version", { version: state.privacy?.version })}
        </div>
      </div>
    </div>}
  </div>;
}
