"use client";
import { useTranslations } from "next-intl";
import { Bike, MapPin, Store, UserRound } from "lucide-react";
import { ShippingFeeCard } from "./shipping-fee-card";
import type { ShipmentStatus } from "@/lib/types/order";
import styles from "../payment/payment-shared.module.css";

// MVP only creates CREATED records. Assignment and tracking are Phase 2.
export type { ShipmentStatus } from "@/lib/types/order";

export interface ShipmentInfoProps {
  receiverName: string;
  receiverPhone: string;
  address?: string;
  storeName?: string;
  storeAddress?: string;
  fee?: number | null;
  /** Only pass an actual shipment status; never infer it from the order status. */
  status?: ShipmentStatus;
  orderType?: "DELIVERY" | "PICKUP";
  className?: string;
}



export function ShipmentCard({
  receiverName,
  receiverPhone,
  address,
  storeName,
  storeAddress,
  fee,
  status,
  orderType = "DELIVERY",
  className = "",
}: ShipmentInfoProps) {
  const t = useTranslations();

  const SHIPMENT_CONFIG: Record<
  ShipmentStatus,
  { label: string; styleClass: string }
> = {
  CREATED: { label: t("business.shipmentcard.shipmentCreated"), styleClass: styles.payPending },
  ASSIGNED: { label: t("business.shipmentcard.driverAssigned"), styleClass: styles.payRefundPending },
  PICKED_UP: {
    label: t("business.shipmentcard.pickedUpByDriver"),
    styleClass: styles.payRefundPending,
  },
  SHIPPING: { label: t("business.orderprogress.delivering"), styleClass: styles.payRefundPending },
  DELIVERED: { label: t("business.shipmentcard.delivered"), styleClass: styles.payPaid },
  FAILED: { label: t("business.shipmentcard.deliveryFailed"), styleClass: styles.payMismatch },
};

  const pickup = orderType === "PICKUP";
  const shipment = status ? SHIPMENT_CONFIG[status] : undefined;
  const title = pickup ? t("business.shipmentcard.storePickup") : t("business.shipmentcard.deliveryDetails");

  return (
    <section
      className={`${styles.shipmentCard} ${styles.paymentScope} ${className}`}
      aria-label={t("business.shipmentcard.collectionDetails")}
    >
      <div className={styles.shipmentHead}>
        <span className={styles.cardIcon}>
          {pickup ? (
            <Store size={22} aria-hidden="true" />
          ) : (
            <Bike size={22} aria-hidden="true" />
          )}
        </span>
        <div>
          <span className={styles.eyebrow}>
            {pickup ? t("business.shipmentcard.pickUpYourMeal") : t("business.checkout.homeDelivery")}
          </span>
          <h3 className={styles.shipmentTitle}>{title}</h3>
        </div>
      </div>
      {!pickup && shipment && (
        <span
          className={`${styles.payChip} ${shipment.styleClass}`}
          role="status"
        >
          <span className={styles.payDot} aria-hidden="true" />
          {shipment.label}
        </span>
      )}

      <dl className={styles.shipmentDetails}>
        <div className={styles.shipmentItem}>
          <dt className={styles.shipmentLabel}>
            <UserRound size={15} aria-hidden="true" /> {t("business.shipmentcard.recipient")} </dt>
          <dd className={styles.shipmentVal}>
            {(receiverName || "").trim() || t("business.shipmentcard.noRecipientNameAvailable")}
          </dd>
          <dd className={styles.shipmentVal}>
            {(receiverPhone || "").trim() ? (
              <a href={`tel:${(receiverPhone || "").replace(/[^+\d]/g, "")}`}>
                {receiverPhone}
              </a>
            ) : (
              t("business.shipmentcard.noPhoneNumberAvailable")
            )}
          </dd>
        </div>
        <div className={styles.shipmentItem}>
          <dt className={styles.shipmentLabel}>
            <MapPin size={15} aria-hidden="true" />{" "}
            {pickup ? t("business.shipmentcard.pickupLocation") : t("business.shipmentcard.deliveryAddress")}
          </dt>
          <dd className={styles.shipmentVal}>
            {pickup
              ? storeName || storeAddress || address || t("business.shipmentcard.noStoreDetailsAvailable")
              : address?.trim() || t("business.shipmentcard.noDeliveryAddressAvailable")}
          </dd>
          {pickup && (storeAddress || address) && (
            <dd className={styles.shipmentSecondary}>{storeAddress || address}</dd>
          )}
        </div>
        {!pickup && (storeName || storeAddress) && (
          <div className={styles.shipmentItem}>
            <dt className={styles.shipmentLabel}>
              <Store size={15} aria-hidden="true" /> {t("business.shipmentcard.preparedAt")} </dt>
            <dd className={styles.shipmentVal}>{storeName}</dd>
            {storeAddress && (
              <dd className={styles.shipmentSecondary}>{storeAddress}</dd>
            )}
          </div>
        )}
      </dl>

      {!pickup && status === "CREATED" && (
        <p className={styles.shipmentNote}> {t("business.shipmentcard.deliveryDetailsRecordedLiveDeliveryTrackingIsNotAvailableYet")} </p>
      )}
      {!pickup && fee !== undefined && <ShippingFeeCard fee={fee} />}
    </section>
  );
}
