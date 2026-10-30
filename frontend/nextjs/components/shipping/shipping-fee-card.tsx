import { Truck } from "lucide-react";
import { formatPrice } from "@/lib/products";
import styles from "../payment/payment-shared.module.css";

export interface ShippingFeeCardProps {
  /** Fee returned by the caller; null means no quote is available yet. */
  fee: number | null;
  freeFromAmount?: number;
  subtotal?: number;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function ShippingFeeCard({
  fee,
  freeFromAmount,
  subtotal,
  loading = false,
  error,
  className = "",
}: ShippingFeeCardProps) {
  const validFee = fee != null && Number.isSafeInteger(fee) && fee >= 0;
  const missing =
    freeFromAmount != null &&
    Number.isSafeInteger(freeFromAmount) &&
    freeFromAmount > 0 &&
    subtotal != null &&
    Number.isSafeInteger(subtotal) &&
    subtotal >= 0
      ? Math.max(0, freeFromAmount - subtotal)
      : null;
  const showHint = !loading && !error && validFee;

  return (
    <div
      className={`${styles.feeCard} ${styles.paymentScope} ${className}`}
      role="status"
      aria-busy={loading}
    >
      <div className={styles.feeRow}>
        <span className={styles.feeLabel}>
          <Truck size={19} aria-hidden="true" /> Phí giao hàng
        </span>
        <strong
          className={
            showHint && fee === 0 ? styles.feeFree : styles.shipmentFee
          }
        >
          {loading
            ? "Đang tính…"
            : error
              ? "Không thể tính phí"
              : !validFee
                ? "Chưa tính được phí"
                : fee === 0
                  ? "Miễn phí"
                  : formatPrice(fee!)}
        </strong>
      </div>
      {!loading && error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && !validFee && (
        <p className={styles.feeHint}>
          Phí giao hàng sẽ hiển thị khi có đủ thông tin địa chỉ và cửa hàng.
        </p>
      )}
      {showHint && fee! > 0 && missing != null && missing > 0 && (
        <p className={styles.feeHint}>
          Mua thêm <strong>{formatPrice(missing)}</strong> để được miễn phí giao
          hàng.
        </p>
      )}
      {showHint && fee === 0 && (
        <p className={styles.feeHint}>Đơn hàng của bạn được miễn phí giao.</p>
      )}
    </div>
  );
}
