import React from "react";
import { Bike, Store } from "lucide-react";
import { formatPrice } from "@/lib/products";
import styles from "../payment/payment-shared.module.css";

export type ShipmentStatus =
  "CREATED" | "ASSIGNED" | "PICKED_UP" | "SHIPPING" | "DELIVERED" | "FAILED";

export interface ShipmentInfoProps {
  receiverName: string;
  receiverPhone: string;
  address?: string;
  fee?: number;
  status?: ShipmentStatus;
  orderType?: "DELIVERY" | "PICKUP";
  className?: string;
}

const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  CREATED: "Đã tạo phiếu giao",
  ASSIGNED: "Đã gán shipper",
  PICKED_UP: "Shipper đã lấy hàng",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  FAILED: "Giao thất bại",
};

export function ShipmentCard({
  receiverName,
  receiverPhone,
  address,
  fee,
  status = "CREATED",
  orderType = "DELIVERY",
  className = "",
}: ShipmentInfoProps) {
  return (
    <div
      className={`${styles.shipmentCard} ${styles.paymentScope} ${className}`}
    >
      <div className={styles.shipmentHead}>
        <h3 className={styles.shipmentTitle}>
          {orderType === "PICKUP" ? "Nhận tại cửa hàng" : "Thông tin giao hàng"}
        </h3>
        {orderType === "DELIVERY" && (
          <span className={`${styles.payChip} ${styles.payPending}`}>
            <span className={styles.payDot} aria-hidden="true" />
            {SHIPMENT_LABEL[status]}
          </span>
        )}
      </div>

      <div className={styles.shipmentItem}>
        <span className={styles.shipmentLabel}>Người nhận</span>
        <p className={styles.shipmentVal}>
          {receiverName} (<a href={`tel:${receiverPhone}`}>{receiverPhone}</a>)
        </p>
      </div>

      <div className={styles.shipmentItem}>
        <span className={styles.shipmentLabel}>Hình thức</span>
        <p className={styles.shipmentVal}>
          {orderType === "DELIVERY" ? (
            <>
              <Bike size={16} aria-hidden="true" /> Giao tận nơi
            </>
          ) : (
            <>
              <Store size={16} aria-hidden="true" /> Nhận tại cửa hàng
            </>
          )}
        </p>
      </div>

      {address && (
        <div className={styles.shipmentItem}>
          <span className={styles.shipmentLabel}>
            {orderType === "PICKUP" ? "Chi nhánh" : "Địa chỉ giao"}
          </span>
          <p className={styles.shipmentVal}>{address}</p>
        </div>
      )}
      {orderType === "DELIVERY" && status === "CREATED" && (
        <p className={styles.feeHint}>
          MVP chỉ tạo phiếu giao hàng. Gán shipper và theo dõi giao hàng thuộc
          Phase 2.
        </p>
      )}

      {fee != null && (
        <div className={styles.shipmentItem}>
          <span className={styles.shipmentLabel}>Phí giao hàng</span>
          <p className={`${styles.shipmentVal} ${styles.shipmentFee}`}>
            {fee === 0 ? "Miễn phí" : formatPrice(fee)}
          </p>
        </div>
      )}
    </div>
  );
}
