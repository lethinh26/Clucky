"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StyledSelect } from "@/components/styled-select";
import { normalizeLocale, persistLocale } from "./locale";
import styles from "./language-switcher.module.css";

function Flag({ locale }: { locale: string }) {
  return locale === "vi" ? (
    <svg className={styles.flag} viewBox="0 0 30 20" aria-hidden="true" focusable="false">
      <path fill="#da251d" d="M0 0h30v20H0z" />
      <path fill="#ff0" d="m15 4 1.35 4.15h4.36l-3.53 2.57 1.35 4.15L15 12.3l-3.53 2.57 1.35-4.15-3.53-2.57h4.36z" />
    </svg>
  ) : (
    <svg className={styles.flag} viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <path fill="#012169" d="M0 0h60v40H0z" />
      <path stroke="#fff" strokeWidth="8" d="m0 0 60 40m0-40L0 40" />
      <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40m0-40L0 40" />
      <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
      <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
    </svg>
  );
}

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <StyledSelect
      ariaLabel={t("language")}
      value={locale}
      disabled={pending}
      align="end"
      triggerContent={<span className={styles.value} title={locale === "vi" ? "Tiếng Việt" : "English"}>
        <Flag locale={locale} />
        <span className={styles.visuallyHidden}>{locale === "vi" ? "Tiếng Việt" : "English"}</span>
      </span>}
      onChange={value => {
        const nextLocale = normalizeLocale(value);
        if (nextLocale === locale) return;
        persistLocale(nextLocale);
        startTransition(() => router.refresh());
      }}
      options={[
        { value: "vi", label: "Tiếng Việt", lang: "vi", icon: <Flag locale="vi" /> },
        { value: "en", label: "English", lang: "en", icon: <Flag locale="en" /> },
      ]}
      style={{ width: 56, height: 36, padding: "0 7px", gap: 5, flexShrink: 0, justifyContent: "center", border: 0, backgroundColor: "transparent" }}
    />
  );
}
