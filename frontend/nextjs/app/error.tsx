"use client";
import { useTranslations } from "next-intl";

import { NavigationError } from "@/components/ui-loader";
import Link from "@/components/ui-loader/navigation-link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  return (
    <NavigationError>
      <main className="container" style={{ paddingBlock: 64 }}>
        <h1>{t("common.pageError.title")}</h1>
        <p>{t("common.pageError.description")}</p>
        <button type="button" className="btn-primary" onClick={reset}>
          {t("common.retry")}{" "}</button>{" "}
        <Link href="/">{t("common.backHome")}</Link>
      </main>
    </NavigationError>
  );
}
