"use client";

import { useTranslation } from "react-i18next";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { normalizeLocale } from "./locale";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const locale = normalizeLocale(i18n.resolvedLanguage);
  return (
    <Select
      aria-label={t("language")}
      value={locale}
      onChange={value => {
        const nextLocale = normalizeLocale(value);
        if (nextLocale !== locale) void i18n.changeLanguage(nextLocale);
      }}
      options={[
        { value: "vi", label: <span lang="vi">Tiếng Việt</span> },
        { value: "en", label: <span lang="en">English</span> },
      ]}
      suffixIcon={<ChevronDown size={14} aria-hidden="true" />}
      showSearch={false}
      virtual={false}
      getPopupContainer={trigger => trigger.parentElement ?? document.body}
      style={{ width: 112, height: 40, flexShrink: 0, fontSize: 13, fontWeight: 600, borderRadius: 12 }}
      styles={{ popup: { root: { background: "#FFFAF3", border: "1px solid #E8E2D9", borderRadius: 14, padding: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 12px 32px rgba(22,16,13,0.12), 0 4px 10px rgba(22,16,13,0.06)" } } }}
    />
  );
}
