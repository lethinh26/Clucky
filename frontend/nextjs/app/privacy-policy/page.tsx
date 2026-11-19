import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPublicPage } from "@/components/legal/legal-public-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: `${t("privacy")} | Clucky`, description: t("reading") };
}
export default function PrivacyPolicyPage() {
  return <LegalPublicPage type="PRIVACY_POLICY" />;
}
