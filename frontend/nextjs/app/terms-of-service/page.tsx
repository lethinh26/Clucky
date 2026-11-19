import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPublicPage } from "@/components/legal/legal-public-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: `${t("terms")} | Clucky`, description: t("reading") };
}
export default function TermsOfServicePage() {
  return <LegalPublicPage type="TERMS_OF_SERVICE" />;
}
