import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources.ts";
import { getBrowserLocale, normalizeLocale, persistLocale } from "./locale.ts";

const i18n = createInstance();
i18n.use(initReactI18next).init({
  resources,
  lng: getBrowserLocale(),
  supportedLngs: ["vi", "en"],
  fallbackLng: "vi",
  defaultNS: "common",
  ns: ["shipping", "loyalty", "maps", "business", "common", "auth", "home", "menu", "admin", "orders", "errors"],
  initAsync: false,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", language => {
  if (typeof document !== "undefined") persistLocale(normalizeLocale(language));
});

export default i18n;
