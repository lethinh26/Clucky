export type Locale = "vi" | "en";
export const localeCookie = "clucky_locale";

export function normalizeLocale(value: unknown): Locale { return value === "en" ? "en" : "vi"; }

export function getBrowserLocale(): Locale {
  if (typeof document === "undefined") return "vi";
  const cookie = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${localeCookie}=`));
  return normalizeLocale(cookie?.slice(localeCookie.length + 1) ?? document.documentElement.lang);
}

export function persistLocale(locale: Locale): void {
  const safeLocale = normalizeLocale(locale);
  document.cookie = `${localeCookie}=${safeLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.documentElement.lang = safeLocale;
}
