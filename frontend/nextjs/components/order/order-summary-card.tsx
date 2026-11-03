"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import React from "react";
import styles from "./order-shared.module.css";

interface OrderSummaryCardProps {
  title?: string;
  subtotal: number;
  discountAmount?: number;
  voucherCode?: string;
  pointsUsed?: number;
  pointsAmount?: number;
  shippingFee?: number;
  totalAmount: number;
  children?: React.ReactNode;
  embedded?: boolean;
}

export function OrderSummaryCard({
  title: titleProp,
  subtotal,
  discountAmount = 0,
  voucherCode,
  pointsUsed = 0,
  pointsAmount = 0,
  shippingFee = 0,
  totalAmount,
  children,
  embedded = false,
}: OrderSummaryCardProps) {
  const t = useTranslations();
  const title = titleProp ?? t("business.cart.orderSummary");

  const { money: formatPrice } = useLocaleTools();
  return (
    <div
      className={`${styles.summaryCard} ${embedded ? styles.summaryEmbedded : ""}`}
    >
      <h3 className={styles.summaryTitle}>{title}</h3>

      <div className={styles.summaryRow}>
        <span>{t("business.cart.subtotal")}</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>

      {discountAmount > 0 && (
        <div className={styles.summaryRow}>
          <span>{t("business.ordersummarycard.discount")} {voucherCode ? `(${voucherCode})` : ""}</span>
          <strong className={styles.summaryDiscount}>
            -{formatPrice(discountAmount)}
          </strong>
        </div>
      )}

      {pointsAmount > 0 && (
        <div className={styles.summaryRow}>
          <span>{t("business.ordersummarycard.rewardPoints")}{pointsUsed} {t("business.ordersummarycard.points")}</span>
          <strong className={styles.summaryDiscount}>
            -{formatPrice(pointsAmount)}
          </strong>
        </div>
      )}

      <div className={styles.summaryRow}>
        <span>{t("business.ordersummarycard.deliveryFee")}</span>
        <strong>
          {shippingFee > 0 ? formatPrice(shippingFee) : t("business.ordersummarycard.free")}
        </strong>
      </div>

      <hr className={styles.summaryDivider} />

      <div className={styles.summaryTotalRow}>
        <span>{t("business.id.total")}</span>
        <strong className={styles.summaryTotalAmount}>
          {formatPrice(totalAmount)}
        </strong>
      </div>

      {children}
    </div>
  );
}
