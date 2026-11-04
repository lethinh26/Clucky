import { createTranslator } from "next-intl";
import { resources } from "./resources.ts";
import type { Locale } from "./locale.ts";

const translators = {
  vi: createTranslator({ locale: "vi", messages: resources.vi }),
  en: createTranslator({ locale: "en", messages: resources.en }),
};

export function getTranslator(locale: Locale) { return translators[locale]; }
