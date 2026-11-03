"use client";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";



import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/ui-loader/navigation-link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { CartBadge } from "@/components/order";
import { useOrder } from "@/components/order/order-provider";
import styles from "./customer-header.module.css";

const links = [
  ["/", "common.nav.home"],
  ["/menu", "common.nav.menu"],
  ["/stores", "common.nav.stores"],
  ["/party", "common.nav.party"],
  ["/orders", "common.nav.orders"],
  ["/account", "common.nav.account"],
] as const;

export function CustomerHeader() {
  const t = useTranslations();
  const { count } = useOrder();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPath(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath(null);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const isCurrent = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className={styles.header} ref={rootRef} data-loading-shell="top">
      <div className={styles.topline}>
        Crispy outside. Happy inside.<span>{t("common.tagline")}</span>
      </div>
      <div className={styles.inner}>
        <Link
          className={styles.brand}
          href="/"
          aria-label={t("common.homeLabel")}
          onClick={() => setOpenPath(null)}
        >
          <Image
            src="/logo_primary.png"
            alt=""
            width={48}
            height={48}
            priority
          />
          <span>
            Clucky<span className={styles.brandCaption}>CRISPY & HAPPY</span>
          </span>
        </Link>
        <nav className={styles.desktopNav} aria-label={t("common.nav.main")}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <LanguageSwitcher />
          <Link
            href="/login"
            className={styles.login}
            aria-current={pathname === "/login" ? "page" : undefined}
            onClick={() => setOpenPath(null)}
          >
            <UserRound size={17} aria-hidden="true" />
            <span>{t("auth.login.action")}</span>
          </Link>
          <Link
            href="/register"
            className={styles.register}
            onClick={() => setOpenPath(null)}
          >
            {t("auth.register.action")}{" "}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <CartBadge count={count}>
            <Link
              href="/cart"
              className={styles.cart}
              aria-label={t("common.nav.cart")}
              onClick={() => setOpenPath(null)}
            >
              <ShoppingBag size={20} aria-hidden="true" />
            </Link>
          </CartBadge>
          <button
            ref={toggleRef}
            className={styles.toggle}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? t("common.nav.close") : t("common.nav.open")}
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <nav
        id={menuId}
        hidden={!open}
        className={styles.mobileNav}
        data-loading-shell="top"
        aria-label={t("common.nav.mobile")}
      >
        <div className={styles.mobileLinks}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
              onClick={() => setOpenPath(null)}
            >
              {t(label)}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className={styles.mobileAuth}>
          <Link href="/login" onClick={() => setOpenPath(null)}>
            {t("auth.login.action")}{" "}</Link>
          <Link href="/register" onClick={() => setOpenPath(null)}>
            {t("auth.register.createAccount")}{" "}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default CustomerHeader;
