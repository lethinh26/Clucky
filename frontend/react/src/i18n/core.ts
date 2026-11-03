import { errorCatalog, defaultErrorCodes, type ErrorCode } from "./error-codes.generated.ts";
import { getBrowserLocale, type Locale } from "./locale.ts";
import { getTranslator } from "./translator.ts";
export { getBrowserLocale, normalizeLocale, localeCookie, type Locale } from "./locale.ts";

const intlLocales = { vi: "vi-VN", en: "en-US" } as const;

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function getErrorMessage(error: unknown, locale: Locale = getBrowserLocale()): string {
  const translate = getTranslator(locale);
  const outer = object(error);
  const response = object(outer.response);
  const body = outer.response ? object(response.data) : outer;
  if (typeof body.code === "string" && Object.prototype.hasOwnProperty.call(errorCatalog, body.code)) {
    return translate(`errors:${body.code as ErrorCode}`);
  }
  const status = typeof response.status === "number" ? response.status : outer.status;
  if (typeof status === "number" && Object.prototype.hasOwnProperty.call(defaultErrorCodes, status)) {
    return translate(`errors:${defaultErrorCodes[status]}`);
  }
  if (outer.code === "ECONNABORTED" || outer.code === "ETIMEDOUT" || outer.name === "TimeoutError") {
    return translate("common:errors.timeout");
  }
  if (outer.code === "NETWORK_ERROR" || outer.code === "ERR_NETWORK" || outer.code === "auth/network-request-failed") {
    return translate("common:errors.network");
  }
  const googleCodes = {
    "auth/popup-closed-by-user": "auth:google.closed",
    "auth/cancelled-popup-request": "auth:google.closed",
    "auth/popup-blocked": "auth:google.blocked",
    "GOOGLE_NOT_CONFIGURED": "auth:google.notConfigured",
  } as const;
  if (typeof outer.code === "string" && Object.prototype.hasOwnProperty.call(googleCodes, outer.code)) {
    return translate(googleCodes[outer.code as keyof typeof googleCodes]);
  }
  return translate("errors:INTERNAL_ERROR");
}

export function formatMoney(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocales[locale], { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocales[locale], options).format(value);
}

export function formatDate(value: string | number | Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocales[locale], {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Ho_Chi_Minh", ...options,
  }).format(date);
}
