"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StyledSelect } from "@/components/styled-select";
import { normalizeLocale, persistLocale } from "./locale";

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
      onChange={value => {
        const nextLocale = normalizeLocale(value);
        if (nextLocale === locale) return;
        persistLocale(nextLocale);
        startTransition(() => router.refresh());
      }}
      options={[
        { value: "vi", label: "Tiếng Việt", lang: "vi" },
        { value: "en", label: "English", lang: "en" },
      ]}
      style={{ width: 112, height: 40, flexShrink: 0, justifyContent: "space-between", borderRadius: 12, backgroundColor: "#FFFAF3" }}
    />
  );
}
