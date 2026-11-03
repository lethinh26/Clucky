"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { Truck } from "lucide-react";
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
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
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
          <Truck size={19} aria-hidden="true" /> {t("business.ordersummarycard.deliveryFee")} </span>
        <strong
          className={
            showHint && fee === 0 ? styles.feeFree : styles.shipmentFee
          }
        >
          {loading
            ? t("business.shippingfeecard.calculating")
            : error
              ? t("business.shippingfeecard.unableToCalculateFee")
              : !validFee
                ? t("business.shippingfeecard.feeNotYetAvailable")
                : fee === 0
                  ? t("business.ordersummarycard.free")
                  : formatPrice(fee!)}
        </strong>
      </div>
      {!loading && error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && !validFee && (
        <p className={styles.feeHint}> {t("business.shippingfeecard.theDeliveryFeeWillAppearOnceTheAddressAndStoreDetailsAre")} </p>
      )}
      {showHint && fee! > 0 && missing != null && missing > 0 && (
        <p className={styles.feeHint}> {t("business.shippingfeecard.spendAnother")} <strong>{formatPrice(missing)}</strong> {t("business.shippingfeecard.toGetFreeDelivery")} </p>
      )}
      {showHint && fee === 0 && (
        <p className={styles.feeHint}>{t("business.shippingfeecard.yourOrderQualifiesForFreeDelivery")}</p>
      )}
    </div>
  );
}
