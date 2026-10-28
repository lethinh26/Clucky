import React from 'react';
import { formatPrice } from '@/lib/products';
import styles from './order-shared.module.css';

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
}

export function OrderSummaryCard({
  title = 'Tóm tắt đơn hàng',
  subtotal,
  discountAmount = 0,
  voucherCode,
  pointsUsed = 0,
  pointsAmount = 0,
  shippingFee = 0,
  totalAmount,
  children,
}: OrderSummaryCardProps) {
  return (
    <aside className={styles.summaryCard}>
      <h3 className={styles.summaryTitle}>{title}</h3>

      <div className={styles.summaryRow}>
        <span>Tạm tính</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>

      {discountAmount > 0 && (
        <div className={styles.summaryRow}>
          <span>Giảm giá {voucherCode ? `(${voucherCode})` : ''}</span>
          <strong className={styles.summaryDiscount}>-{formatPrice(discountAmount)}</strong>
        </div>
      )}

      {pointsAmount > 0 && (
        <div className={styles.summaryRow}>
          <span>Điểm tích lũy ({pointsUsed} điểm)</span>
          <strong className={styles.summaryDiscount}>-{formatPrice(pointsAmount)}</strong>
        </div>
      )}

      <div className={styles.summaryRow}>
        <span>Phí giao hàng</span>
        <strong>{shippingFee > 0 ? formatPrice(shippingFee) : 'Miễn phí'}</strong>
      </div>

      <hr className={styles.summaryDivider} />

      <div className={styles.summaryTotalRow}>
        <span>Tổng cộng</span>
        <strong className={styles.summaryTotalAmount}>{formatPrice(totalAmount)}</strong>
      </div>

      {children}
    </aside>
  );
}
