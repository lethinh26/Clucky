import { Bike, MapPin, Store, UserRound } from "lucide-react";
import { ShippingFeeCard } from "./shipping-fee-card";
import styles from "../payment/payment-shared.module.css";

// MVP only creates CREATED records. Assignment and tracking are Phase 2.
export type ShipmentStatus =
  "CREATED" | "ASSIGNED" | "PICKED_UP" | "SHIPPING" | "DELIVERED" | "FAILED";

export interface ShipmentInfoProps {
  receiverName: string;
  receiverPhone: string;
  address?: string;
  storeName?: string;
  fee?: number | null;
  /** Only pass an actual shipment status; never infer it from the order status. */
  status?: ShipmentStatus;
  orderType?: "DELIVERY" | "PICKUP";
  className?: string;
}

const SHIPMENT_CONFIG: Record<
  ShipmentStatus,
  { label: string; styleClass: string }
> = {
  CREATED: { label: "Đã tạo phiếu giao", styleClass: styles.payPending },
  ASSIGNED: { label: "Đã gán shipper", styleClass: styles.payRefundPending },
  PICKED_UP: {
    label: "Shipper đã lấy hàng",
    styleClass: styles.payRefundPending,
  },
  SHIPPING: { label: "Đang giao", styleClass: styles.payRefundPending },
  DELIVERED: { label: "Đã giao", styleClass: styles.payPaid },
  FAILED: { label: "Giao thất bại", styleClass: styles.payMismatch },
};

export function ShipmentCard({
  receiverName,
  receiverPhone,
  address,
  storeName,
  fee,
  status,
  orderType = "DELIVERY",
  className = "",
}: ShipmentInfoProps) {
  const pickup = orderType === "PICKUP";
  const shipment = status ? SHIPMENT_CONFIG[status] : undefined;
  const title = pickup ? "Nhận tại cửa hàng" : "Thông tin giao hàng";

  return (
    <section
      className={`${styles.shipmentCard} ${styles.paymentScope} ${className}`}
      aria-label="Thông tin nhận món"
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
            {pickup ? "Tự đến lấy món" : "Giao tận nơi"}
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
            <UserRound size={15} aria-hidden="true" /> Người nhận
          </dt>
          <dd className={styles.shipmentVal}>
            {receiverName.trim() || "Chưa có tên người nhận"}
          </dd>
          <dd className={styles.shipmentVal}>
            {receiverPhone.trim() ? (
              <a href={`tel:${receiverPhone.replace(/[^+\d]/g, "")}`}>
                {receiverPhone}
              </a>
            ) : (
              "Chưa có số điện thoại"
            )}
          </dd>
        </div>
        <div className={styles.shipmentItem}>
          <dt className={styles.shipmentLabel}>
            <MapPin size={15} aria-hidden="true" />{" "}
            {pickup ? "Địa điểm nhận món" : "Địa chỉ giao"}
          </dt>
          <dd className={styles.shipmentVal}>
            {pickup
              ? storeName || address || "Chưa có thông tin cửa hàng"
              : address?.trim() || "Chưa có địa chỉ giao"}
          </dd>
          {pickup && storeName && address && (
            <dd className={styles.shipmentSecondary}>{address}</dd>
          )}
        </div>
        {!pickup && storeName && (
          <div className={styles.shipmentItem}>
            <dt className={styles.shipmentLabel}>
              <Store size={15} aria-hidden="true" /> Chuẩn bị tại
            </dt>
            <dd className={styles.shipmentVal}>{storeName}</dd>
          </div>
        )}
      </dl>

      {!pickup && status === "CREATED" && (
        <p className={styles.shipmentNote}>
          Đã ghi nhận thông tin giao hàng. Theo dõi vận chuyển trực tiếp hiện
          chưa khả dụng.
        </p>
      )}
      {!pickup && fee !== undefined && <ShippingFeeCard fee={fee} />}
    </section>
  );
}
