"use client";
import { notify, useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";



import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/ui-loader/navigation-link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { CartBadge } from "@/components/order";
import { useOrder } from "@/components/order/order-provider";
import { NotificationPopover } from "@/components/notification";
import styles from "./customer-header.module.css";
import { useSession } from "./auth/use-session";
import { authApi, getErrorMessage } from "@/lib/api";

const links = [
  ["/", "common.nav.home"],
  ["/menu", "common.nav.menu"],
  ["/stores", "common.nav.stores"],
  ["/vouchers", "common.nav.vouchers"],
  ["/loyalty", "common.nav.loyalty"],
  ["/orders", "common.nav.orders"],
  ["/account", "common.nav.account"],
] as const;

export function CustomerHeader() {
  const t = useTranslations();
  const { count } = useOrder();
  const { user } = useSession();
  const visibleLinks = links.filter(([href]) => href !== "/account" || Boolean(user));
  const [logoutError, setLogoutError] = useState<unknown>(null);
  useFeedback(logoutError ? getErrorMessage(logoutError) : null);
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try { await authApi.logout(); notify.success(t("common.feedback.signedOut")); }
    catch (error) { setLogoutError(error); }
    finally { setLoggingOut(false); }
  };
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
          {visibleLinks.map(([href, label]) => (
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
          <Link
            href={user ? "/account" : "/login"}
            className={styles.login}
            aria-current={pathname === (user ? "/account" : "/login") ? "page" : undefined}
            onClick={() => setOpenPath(null)}
          >
            <UserRound size={17} aria-hidden="true" />
            <span>{user ? user.fullName : t("auth.login.action")}</span>
          </Link>
          {user ? <button type="button" className={styles.register} disabled={loggingOut} onClick={logout}>{t("common.signOut")}</button> : <Link
            href="/register"
            className={styles.register}
            onClick={() => setOpenPath(null)}
          >
            {t("auth.register.action")}{" "}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>}
          <div className={styles.notification}>
            {user && <NotificationPopover key={user.userId} />}
          </div>
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
          <div className={styles.language}><LanguageSwitcher /></div>
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
          {visibleLinks.map(([href, label]) => (
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
          <Link href={user ? "/account" : "/login"} onClick={() => setOpenPath(null)}>
            {user ? user.fullName : t("auth.login.action")}{" "}</Link>
          {user ? <button type="button" disabled={loggingOut} onClick={logout}>{t("common.signOut")}</button> : <Link href="/register" onClick={() => setOpenPath(null)}>
            {t("auth.register.createAccount")}{" "}<ArrowUpRight size={16} aria-hidden="true" />
          </Link>}
        </div>
      </nav>
    </header>
  );
}

export default CustomerHeader;
