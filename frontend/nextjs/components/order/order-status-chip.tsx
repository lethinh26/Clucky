"use client";
import { useTranslations } from "next-intl";
import React from 'react';
import { OrderStatus, OrderType } from '@/lib/types/order';
import { orderStatusKey } from '@/lib/order-demo';
import styles from './order-shared.module.css';

interface OrderStatusChipProps {
  status: OrderStatus;
  type?: OrderType;
  className?: string;
}



export function OrderStatusChip({ status, type, className = '' }: OrderStatusChipProps) {
  const t = useTranslations();

  const statusStyles: Record<OrderStatus, string> = {
    PENDING_PAYMENT: styles.statusPendingPayment,
    CONFIRMED: styles.statusConfirmed,
    PREPARING: styles.statusPreparing,
    READY: styles.statusReady,
    SHIPPING: styles.statusShipping,
    COMPLETED: styles.statusCompleted,
    CANCELLED: styles.statusCancelled,
    DELIVERY_FAILED: styles.statusCancelled,
  };

  return (
    <span className={`${styles.statusChip} ${statusStyles[status]} ${className}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {t(orderStatusKey(status, type))}
    </span>
  );
}
