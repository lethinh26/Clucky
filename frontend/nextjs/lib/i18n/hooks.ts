"use client";

import { useLocale } from "next-intl";
import { formatMoney, formatNumber, formatDate, getErrorMessage } from "./core";
import { normalizeLocale } from "./locale";

export function useLocaleTools() {
  const locale = normalizeLocale(useLocale());
  return {
    locale,
    errorMessage: (error: unknown) => getErrorMessage(error, locale),
    money: (value: number) => formatMoney(value, locale),
    number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
    date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatDate(value, locale, options),
  };
}
