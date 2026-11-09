"use client";

import { useTranslation } from "react-i18next";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { normalizeLocale } from "./locale";

function Flag({ locale }: { locale: string }) {
  return (
    <svg
      width={22}
      height={15}
      viewBox={locale === "vi" ? "0 0 30 20" : "0 0 60 40"}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0, borderRadius: 3, overflow: "hidden" }}
    >
      {locale === "vi" ? (
        <>
          <path fill="#da251d" d="M0 0h30v20H0z" />
          <path fill="#ff0" d="m15 4 1.35 4.15h4.36l-3.53 2.57 1.35 4.15L15 12.3l-3.53 2.57 1.35-4.15-3.53-2.57h4.36z" />
        </>
      ) : (
        <>
          <path fill="#012169" d="M0 0h60v40H0z" />
          <path stroke="#fff" strokeWidth="8" d="m0 0 60 40m0-40L0 40" />
          <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40m0-40L0 40" />
          <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
          <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
        </>
      )}
    </svg>
  );
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const locale = normalizeLocale(i18n.resolvedLanguage);
  return (
    <Select
      aria-label={`${t("language")}: ${locale === "vi" ? "Tiếng Việt" : "English"}`}
      value={locale}
      variant="borderless"
      placement="bottomRight"
      popupMatchSelectWidth={160}
      labelRender={() => (
        <span title={locale === "vi" ? "Tiếng Việt" : "English"} style={{ display: "inline-flex", verticalAlign: "middle" }}>
          <Flag locale={locale} />
        </span>
      )}
      onChange={value => {
        const nextLocale = normalizeLocale(value);
        if (nextLocale !== locale) void i18n.changeLanguage(nextLocale);
      }}
      options={[
        { value: "vi", label: <span lang="vi">Tiếng Việt</span> },
        { value: "en", label: <span lang="en">English</span> },
      ]}
      suffixIcon={<ChevronDown size={14} aria-hidden="true" />}
      optionRender={option => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flag locale={String(option.value)} />
          {option.label}
        </span>
      )}
      showSearch={false}
      virtual={false}
      getPopupContainer={trigger => trigger.parentElement ?? document.body}
      style={{ width: 64, height: 40, flexShrink: 0, fontSize: 13, fontWeight: 600, borderRadius: 12 }}
      styles={{ popup: { root: { background: "#FFFAF3", border: "1px solid #E8E2D9", borderRadius: 14, padding: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 12px 32px rgba(22,16,13,0.12), 0 4px 10px rgba(22,16,13,0.06)" } } }}
    />
  );
}
