import React from 'react';
import { PaymentStatus } from '@/lib/types/order';
import styles from './payment-shared.module.css';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; styleClass: string }> = {
  UNPAID: { label: 'Chưa thanh toán', styleClass: styles.payUnpaid },
  PENDING: { label: 'Chờ thanh toán', styleClass: styles.payPending },
  PAID: { label: 'Đã thanh toán', styleClass: styles.payPaid },
  EXPIRED: { label: 'Hết hạn', styleClass: styles.payExpired },
  MISMATCH: { label: 'Sai lệch', styleClass: styles.payMismatch },
  COLLECTED: { label: 'Đã thu COD', styleClass: styles.payCollected },
  REFUND_PENDING: { label: 'Chờ hoàn tiền', styleClass: styles.payRefundPending },
  REFUNDED: { label: 'Đã hoàn tiền', styleClass: styles.payRefunded },
};

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, styleClass: styles.payPending };

  return (
    <span className={`${styles.payChip} ${config.styleClass} ${className}`}>
      <span className={styles.payDot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
