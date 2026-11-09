"use client";
import { useTranslations } from "next-intl";
import React from "react";
import type { PaymentStatus as OrderPaymentStatus } from "@/lib/types/order";
import styles from "./payment-shared.module.css";

export type PaymentStatus =
  | OrderPaymentStatus
  | "UNPAID"
  | "MISMATCH"
  | "COLLECTED"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}



export function PaymentStatusBadge({
  status,
  className = "",
}: PaymentStatusBadgeProps) {
  const t = useTranslations();

  const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; styleClass: string }
> = {
  UNKNOWN: { label: t("business.paymentstatusbadge.unknownStatus"), styleClass: styles.payExpired },
  UNPAID: { label: t("business.paymentstatusbadge.unpaid"), styleClass: styles.payUnpaid },
  FAILED: { label: t("business.paymentstatusbadge.paymentFailed"), styleClass: styles.payMismatch },
  PENDING: { label: t("business.checkout.awaitingPayment"), styleClass: styles.payPending },
  PAID: { label: t("business.demoordercontrols.paid"), styleClass: styles.payPaid },
  EXPIRED: { label: t("business.paymentstatusbadge.expired"), styleClass: styles.payExpired },
  MISMATCH: { label: t("business.paymentstatusbadge.amountMismatch"), styleClass: styles.payMismatch },
  COLLECTED: { label: t("business.paymentstatusbadge.codCollected"), styleClass: styles.payCollected },
  REFUND_PENDING: {
    label: t("business.paymentstatusbadge.refundPending"),
    styleClass: styles.payRefundPending,
  },
  REFUNDED: { label: t("business.paymentstatusbadge.refunded"), styleClass: styles.payRefunded },
};

  const config = STATUS_CONFIG[status] ?? {
    label: t("business.paymentstatusbadge.unknownStatus"),
    styleClass: styles.payExpired,
  };

  return (
    <span
      className={`${styles.paymentScope} ${styles.payChip} ${config.styleClass} ${className}`}
      role="status"
      aria-label={t("business.paymentstatusbadge.payment", { value1: config.label })}
    >
      <span className={styles.payDot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
