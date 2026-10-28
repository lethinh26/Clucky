import React from "react";
import { formatPrice } from "@/lib/products";
import styles from "../payment/payment-shared.module.css";

export interface ShippingFeeCardProps {
  /** Phí ship đã tính; null = chưa tính được */
  fee: number | null;
  /** Ngưỡng miễn phí ship (nếu có) */
  freeFromAmount?: number;
  /** Tạm tính hiện tại để gợi ý mua thêm đủ free-ship */
  subtotal?: number;
  loading?: boolean;
  className?: string;
}

export function ShippingFeeCard({
  fee,
  freeFromAmount,
  subtotal,
  loading = false,
  className = "",
}: ShippingFeeCardProps) {
  const missing =
    freeFromAmount != null && subtotal != null
      ? Math.max(0, freeFromAmount - subtotal)
      : null;

  return (
    <div
      className={`${styles.feeCard} ${styles.paymentScope} ${className}`}
      role="status"
      aria-busy={loading}
    >
      <div className={styles.feeRow}>
        <span>Phí giao hàng</span>
        {loading ? (
          <strong>Đang tính…</strong>
        ) : fee == null ? (
          <strong>Chưa tính được phí</strong>
        ) : fee === 0 ? (
          <strong className={styles.feeFree}>Miễn phí</strong>
        ) : (
          <strong className={styles.shipmentFee}>{formatPrice(fee)}</strong>
        )}
      </div>
      {missing != null && missing > 0 && (
        <p className={styles.feeHint}>
          Mua thêm {formatPrice(missing)} để được miễn phí giao hàng.
        </p>
      )}
      {missing === 0 && fee === 0 && (
        <p className={styles.feeHint}>Đơn hàng của bạn được miễn phí giao.</p>
      )}
    </div>
  );
}
