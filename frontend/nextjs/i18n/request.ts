import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { localeCookie, normalizeLocale } from "../lib/i18n/locale";
import { resources } from "../lib/i18n/resources";

export default getRequestConfig(async () => {
  const locale = normalizeLocale((await cookies()).get(localeCookie)?.value);
  return { locale, messages: resources[locale], timeZone: "Asia/Ho_Chi_Minh" };
});
