import i18n from "./index.ts";
import type { Locale } from "./locale.ts";

export function getTranslator(locale: Locale) { return i18n.getFixedT(locale); }
