"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { CartBadge } from "@/components/order";
import { useOrder } from "@/components/order/order-provider";
import styles from "./customer-header.module.css";

const links = [
  ["/", "Trang chủ"],
  ["/menu", "Thực đơn"],
  ["/stores", "Cửa hàng"],
  ["/party", "Đặt tiệc"],
  ["/orders", "Đơn hàng"],
  ["/account", "Tài khoản"],
] as const;

export function CustomerHeader() {
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
    <header className={styles.header} ref={rootRef}>
      <div className={styles.topline}>
        Crispy outside. Happy inside.<span>Một bữa ngon, thêm niềm vui.</span>
      </div>
      <div className={styles.inner}>
        <Link
          className={styles.brand}
          href="/"
          aria-label="Clucky trang chủ"
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
        <nav className={styles.desktopNav} aria-label="Điều hướng chính">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link
            href="/login"
            className={styles.login}
            aria-current={pathname === "/login" ? "page" : undefined}
            onClick={() => setOpenPath(null)}
          >
            <UserRound size={17} aria-hidden="true" />
            <span>Đăng nhập</span>
          </Link>
          <Link
            href="/register"
            className={styles.register}
            onClick={() => setOpenPath(null)}
          >
            Đăng ký <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <CartBadge count={count}>
            <Link
              href="/cart"
              className={styles.cart}
              aria-label="Giỏ hàng"
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
            aria-label={open ? "Đóng điều hướng" : "Mở điều hướng"}
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
        aria-label="Điều hướng di động"
      >
        <div className={styles.mobileLinks}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? "page" : undefined}
              onClick={() => setOpenPath(null)}
            >
              {label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className={styles.mobileAuth}>
          <Link href="/login" onClick={() => setOpenPath(null)}>
            Đăng nhập
          </Link>
          <Link href="/register" onClick={() => setOpenPath(null)}>
            Tạo tài khoản <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default CustomerHeader;
