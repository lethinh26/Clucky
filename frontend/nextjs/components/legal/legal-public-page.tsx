"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { legalApi, type LegalType, type PublicLegalDocument } from "@/lib/api";

/** Only server-sanitized published HTML is rendered; the public API has no write methods. */
export function LegalPublicPage({ type }: { type: LegalType }) {
  const t = useTranslations("legal");
  const { locale } = useLocaleTools();
  const [document, setDocument] = useState<PublicLegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void legalApi.published(type).then(result => { if (active) setDocument(result); })
      .catch(() => { if (active) { setDocument(null); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  return <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
    <div className="rounded-3xl border border-[#E8E2D9] bg-[#FFFAF3] px-6 py-9 shadow-sm sm:px-12">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#8F1216]">Clucky · {t("links")}</p>
      <h1 className="mb-3 text-3xl font-bold text-[#16100D] sm:text-4xl">
        {document ? locale === "vi" ? document.titleVi : document.titleEn
          : type === "TERMS_OF_SERVICE" ? t("terms") : t("privacy")}
      </h1>
      {loading ? <p role="status">{t("loading")}</p> : error || !document
        ? <p role="alert">{t("notAvailable")}</p> : <>
          <p className="mb-8 border-b border-[#E8E2D9] pb-5 text-sm text-[#75675E]">
            {t("reading")} · {t("version", { version: document.version })} ·{' '}
            {t("publishedAt", { date: new Date(document.publishedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US") })}
          </p>
          <div className="legal-public-content" lang={locale}
            dangerouslySetInnerHTML={{ __html: locale === "vi" ? document.htmlVi : document.htmlEn }} />
        </>}
    </div>
  </main>;
}
