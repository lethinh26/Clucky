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

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; styleClass: string }
> = {
  UNPAID: { label: "Chưa thanh toán", styleClass: styles.payUnpaid },
  FAILED: { label: "Thanh toán thất bại", styleClass: styles.payMismatch },
  PENDING: { label: "Chờ thanh toán", styleClass: styles.payPending },
  PAID: { label: "Đã thanh toán", styleClass: styles.payPaid },
  EXPIRED: { label: "Hết hạn", styleClass: styles.payExpired },
  MISMATCH: { label: "Số tiền không khớp", styleClass: styles.payMismatch },
  COLLECTED: { label: "Đã thu COD", styleClass: styles.payCollected },
  REFUND_PENDING: {
    label: "Chờ hoàn tiền",
    styleClass: styles.payRefundPending,
  },
  REFUNDED: { label: "Đã hoàn tiền", styleClass: styles.payRefunded },
};

export function PaymentStatusBadge({
  status,
  className = "",
}: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: "Chưa rõ trạng thái",
    styleClass: styles.payExpired,
  };

  return (
    <span
      className={`${styles.paymentScope} ${styles.payChip} ${config.styleClass} ${className}`}
      role="status"
      aria-label={`Thanh toán: ${config.label}`}
    >
      <span className={styles.payDot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
