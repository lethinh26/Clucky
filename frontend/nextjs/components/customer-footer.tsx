"use client";
import { useTranslations } from "next-intl";


import Image from "next/image";
import Link from "@/components/ui-loader/navigation-link";

export function CustomerFooter() {
  const t = useTranslations();
  return (
    <footer className="site-footer" data-loading-shell="bottom">
      <div className="footer-inner">
        <Link className="brand" href="/" style={{ color: "#FFFAF3" }}>
          <Image
            className="brand-logo footer-logo"
            src="/logo_primary.png"
            alt="Clucky Logo"
            width={40}
            height={40}
          />
          <span>Clucky</span>
        </Link>

        <nav className="footer-links" aria-label={t("common.footer.links")}>
          <Link href="/menu">{t("common.nav.menu")}</Link>
          <Link href="/stores">{t("common.nav.stores")}</Link>
          <Link href="/vouchers">{t("common.nav.vouchers")}</Link>
          <Link href="/loyalty">{t("common.nav.loyalty")}</Link>
          <Link href="/orders">{t("common.nav.trackOrders")}</Link>
          <Link href="/account">{t("common.nav.account")}</Link>
        </nav>

        <div
          style={{
            color: "rgba(245, 237, 224, 0.7)",
            fontSize: 13,
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          <span style={{ color: "#C9A227", fontWeight: 700 }}>Clucky</span> —
          Crispy Outside, Happy Inside. © 2026
        </div>
      </div>
    </footer>
  );
}

export default CustomerFooter;
