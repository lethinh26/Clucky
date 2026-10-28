import React from 'react';
import { OrderStatus } from '@/lib/types/order';
import styles from './order-shared.module.css';

interface OrderStatusChipProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; styleClass: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', styleClass: styles.statusPendingPayment },
  CONFIRMED: { label: 'Đã xác nhận', styleClass: styles.statusConfirmed },
  PREPARING: { label: 'Đang chuẩn bị', styleClass: styles.statusPreparing },
  READY: { label: 'Sẵn sàng giao', styleClass: styles.statusReady },
  SHIPPING: { label: 'Đang giao hàng', styleClass: styles.statusShipping },
  COMPLETED: { label: 'Hoàn thành', styleClass: styles.statusCompleted },
  CANCELLED: { label: 'Đã hủy', styleClass: styles.statusCancelled },
};

export function OrderStatusChip({ status, className = '' }: OrderStatusChipProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, styleClass: styles.statusConfirmed };

  return (
    <span className={`${styles.statusChip} ${config.styleClass} ${className}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
