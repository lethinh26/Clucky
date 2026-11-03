"use client";
import { useTranslations } from "next-intl";
import React from 'react';
import { OrderStatus } from '@/lib/types/order';
import styles from './order-shared.module.css';

interface OrderStatusChipProps {
  status: OrderStatus;
  className?: string;
}



export function OrderStatusChip({ status, className = '' }: OrderStatusChipProps) {
  const t = useTranslations();

  const STATUS_CONFIG: Record<OrderStatus, { label: string; styleClass: string }> = {
  PENDING_PAYMENT: { label: t("business.checkout.awaitingPayment"), styleClass: styles.statusPendingPayment },
  CONFIRMED: { label: t("business.orderstatuschip.confirmed"), styleClass: styles.statusConfirmed },
  PREPARING: { label: t("business.orderprogress.preparing"), styleClass: styles.statusPreparing },
  READY: { label: t("business.orderstatuschip.readyForDelivery"), styleClass: styles.statusReady },
  SHIPPING: { label: t("business.orderstatuschip.outForDelivery"), styleClass: styles.statusShipping },
  COMPLETED: { label: t("business.orders.completed"), styleClass: styles.statusCompleted },
  CANCELLED: { label: t("business.orders.cancelled"), styleClass: styles.statusCancelled },
};

  const config = STATUS_CONFIG[status] ?? { label: status, styleClass: styles.statusConfirmed };

  return (
    <span className={`${styles.statusChip} ${config.styleClass} ${className}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
