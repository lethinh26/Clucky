"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Menu, X } from "lucide-react";
import { CartBadge } from "@/components/order";
import { useOrder } from "@/components/order/order-provider";

export function CustomerHeader() {
  const { count } = useOrder();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "Trang chủ"],
    ["/menu", "Thực đơn"],
    ["/stores", "Cửa hàng"],
    ["/party", "Đặt tiệc"],
    ["/orders", "Đơn hàng"],
    ["/account", "Tài khoản"],
  ];
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Clucky trang chủ">
        <Image
          className="brand-logo"
          src="/logo_primary.png"
          alt="Clucky Logo"
          width={44}
          height={44}
          priority
        />
        <span>Clucky</span>
      </Link>

      <nav className="nav" aria-label="Điều hướng chính">
        <div
          className={`nav-links ${open ? "nav-links-open" : ""}`}
          id="customer-navigation"
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </div>
        <CartBadge count={count}>
          <Link className="nav-order" href="/cart">
            <ShoppingBag size={16} className="inline mr-1" />
            <span>Giỏ hàng</span>
          </Link>
        </CartBadge>
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={open ? "Đóng điều hướng" : "Mở điều hướng"}
          aria-expanded={open}
          aria-controls="customer-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
    </header>
  );
}

export default CustomerHeader;
