"use client";
import { useTranslations } from "next-intl";
import React from "react";
import styles from "./order-shared.module.css";

interface CartBadgeProps {
  count: number;
  children?: React.ReactNode;
}

export function CartBadge({ count, children }: CartBadgeProps) {
  const t = useTranslations();

  return (
    <div
      className={styles.cartBadgeWrapper}
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
      {count > 0 && (
        <span
          className={styles.cartBadge}
          aria-label={t("business.cartbadge.itemsInYourCart", { value1: count })}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
