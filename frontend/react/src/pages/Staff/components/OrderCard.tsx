import i18n from "../../../i18n/index.ts";
import React from "react";
import {
  Clock3,
  CircleAlert,
  Store,
  Globe,
  ChefHat,
  PackageCheck,
  CheckCircle2,
  Wallet,
  Eye,
  MessageSquare,
  Utensils,
  ShoppingBag,
  Printer,
  Truck,
  MapPin,
} from "lucide-react";
import type { StaffOrder } from "../../../mocks/mockStaffOrders";
import type { AdminOrderStatus } from "../../../types/order";
import { useElapsedTime } from "../../../hooks/useElapsedTime";
import styles from "./order-card.module.css";
import { useTranslation } from "react-i18next";
import { getFulfillmentMode, fulfillmentLabel } from "../../../lib/order-fulfillment";
import type { ShipmentSimulationTracking } from "../../../lib/api";

interface OrderCardProps {
  order: StaffOrder;
  onStatusChange?: (orderId: string, nextStatus: AdminOrderStatus) => void;
  onPaymentCollect?: (order: StaffOrder) => void;
  onViewDetails?: (orderId: string) => void;
  onReprint?: (order: StaffOrder) => void;
  onPrintKot?: (order: StaffOrder) => void;
  formatMoney?: (val: number) => string;
  tracking?: ShipmentSimulationTracking;
}

const defaultFormatMoney = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onPaymentCollect,
  onViewDetails,
  onReprint,
  onPrintKot,
  formatMoney = defaultFormatMoney,
  tracking,
}) => {
  const { t } = useTranslation();
  const { elapsedTimeText, isSlaBreached, isSlaWarning, diffMinutes } =
    useElapsedTime(order.createdAt);

  // SLA chỉ áp dụng khi đơn đang chờ chế biến (CONFIRMED hoặc PREPARING)
  const isCookingStage =
    order.status === "CONFIRMED" || order.status === "PREPARING";
  const showSlaBreached = isCookingStage && isSlaBreached;
  const showSlaWarning = isCookingStage && isSlaWarning && !isSlaBreached;
  const fulfillment = getFulfillmentMode(order);

  const cardClassName = [
    styles.card,
    showSlaBreached ? styles.slaBreached : "",
    showSlaWarning ? styles.slaWarning : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Format số thứ tự gọi món chuẩn 3 chữ số (ví dụ: #012)
  const formattedQueue = `#${String(order.queueNumber || 0).padStart(3, "0")}`;

  // Nhãn trạng thái bếp
  const renderKitchenStatus = () => {
    switch (order.status) {
      case "PENDING_PAYMENT":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenPending}`}>
            <Clock3 size={13} /> {t("business:staffcard.pendingPayment")}
          </span>
        );
      case "CONFIRMED":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenConfirmed}`}>
            <ChefHat size={13} /> {t("business:staffcard.confirmed")}
          </span>
        );
      case "PREPARING":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenPreparing}`}>
            <ChefHat size={13} /> {t("business:staffcard.preparing")}
          </span>
        );
      case "READY":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenReady}`}>
            <PackageCheck size={13} /> {fulfillment === 'DELIVERY' ? i18n.t("shipping:ui.foodReadyAwaitingDelivery") : fulfillment === 'DINE_IN' ? i18n.t("shipping:ui.askTheCustomerToCollectTheirOrderAtTheCounter") : t("business:pickupFlow.ready")}
          </span>
        );
      case "COMPLETED":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenCompleted}`}>
            <CheckCircle2 size={13} /> {fulfillment === 'DINE_IN' ? i18n.t("shipping:ui.customerCollectedTheOrderAtTheCounter") : fulfillment === 'DELIVERY' ? i18n.t("shipping:ui.deliveredSimulation") : t("business:pickupFlow.completed")}
          </span>
        );
      case "SHIPPING":
        return <span className={`${styles.badgeKitchen} ${styles.badgeKitchenReady}`}><Truck size={13} /> {tracking?.status === 'FAILED' ? i18n.t("shipping:ui.deliveryFailedActionNeeded") : tracking?.status === 'ASSIGNED' ? i18n.t("shipping:ui.waitingForTheRiderToCollectTheOrder") : i18n.t("shipping:ui.deliveringSimulation")}</span>;
      case "DELIVERY_FAILED":
        return <span className={`${styles.badgeKitchen} ${styles.badgeKitchenPending}`}><CircleAlert size={13} /> {i18n.t("shipping:ui.deliveryUnsuccessful")}</span>;
      default:
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenCompleted}`}>
            {order.status}
          </span>
        );
    }
  };

  // Nhãn trạng thái tiền
  const renderPaymentStatus = () => {
    if (fulfillment === 'DELIVERY' && order.paymentMethod === 'COD'
        && tracking?.merchantPaymentStatus === 'PAID_SIMULATED') {
      return (
        <span className={`${styles.badgePayment} ${styles.badgePaymentPaid}`}>
          <CheckCircle2 size={13} /> {i18n.t("shipping:ui.paid")}
        </span>
      );
    }
    if (order.paymentStatus === "PAID") {
      return (
        <span className={`${styles.badgePayment} ${styles.badgePaymentPaid}`}>
          <CheckCircle2 size={13} /> {t("business:staffcard.paidOnline")}
        </span>
      );
    }
    if (order.paymentStatus === "COLLECTED") {
      return (
        <span className={`${styles.badgePayment} ${styles.badgePaymentCollected}`}>
          <Wallet size={13} /> {t("business:staffcard.collectedCounter")}
        </span>
      );
    }
    return (
      <span className={`${styles.badgePayment} ${styles.badgePaymentPending}`}>
        <Wallet size={13} /> {t("business:staffcard.unpaid")}
      </span>
    );
  };

  return (
    <article
      className={cardClassName}
      tabIndex={0}
      aria-label={"Đơn hàng " + formattedQueue + " mã " + order.orderCode}
    >
      {/* 1. Header Thẻ */}
      <div className={styles.cardHeader}>
        <div className={styles.queueBox}>
          <span className={styles.queueNumber}>{formattedQueue}</span>
          <span className={styles.orderCode}>{order.orderCode}</span>
        </div>

        <div className={styles.headerBadges}>
          <div className={styles.badgeRow}>
            {fulfillment === "DELIVERY" ? (
              <span className={styles.badgeTakeAway} title={fulfillmentLabel(order)}>
                <Truck size={12} /> {i18n.t("shipping:ui.delivery")}
              </span>
            ) : fulfillment === "DINE_IN" ? (
              <span className={styles.badgeDiningIn}>
                <Utensils size={12} /> {t("business:staffcard.dineIn")}
              </span>
            ) : (
              <span className={styles.badgeTakeAway}>
                <ShoppingBag size={12} /> {fulfillment === 'TAKE_AWAY' ? t("business:staffcard.takeAway") : i18n.t("shipping:ui.storePickup")}
              </span>
            )}

            {order.orderSource === "COUNTER" ? (
              <span className={styles.badgeSourceCounter}>
                <Store size={11} /> {t("business:staffcard.counter")}
              </span>
            ) : (
              <span className={styles.badgeSourceWeb}>
                <Globe size={11} /> WEB
              </span>
            )}
          </div>
        </div>
      </div>

      {fulfillment === 'DELIVERY' && (
        <div className={styles.deliveryDetails}>
          {order.deliveryAddress ? (
            <span title={order.deliveryAddress}><MapPin size={14} /> {order.deliveryAddress}</span>
          ) : <strong>{i18n.t("shipping:ui.deliveryAddressMissingVerificationRequired")}</strong>}
          <span>{i18n.t("shipping:ui.deliveryFee")} {formatMoney(order.shippingFee)}</span>
          {tracking?.status === 'FAILED' && tracking.resolution !== 'CLOSED_UNDELIVERABLE' && (
            <strong>{i18n.t("shipping:ui.deliveryFailedHandleItemReturnOrReattempt")}</strong>
          )}
          {order.status === 'READY' && <span>{tracking?.status === 'ASSIGNED' ? i18n.t("shipping:ui.waitingForTheSimulatedRiderToCollect") : i18n.t("shipping:ui.foodIsReadyAwaitingTheDeliverySystem")}</span>}
          {order.status === 'SHIPPING' && tracking?.status !== 'FAILED' && <span>{i18n.t("shipping:ui.simulatingDeliveryOpenDetailsToTrackTheRoute")}</span>}
          {order.paymentMethod === 'COD' && <span>{tracking?.merchantPaymentStatus === 'PAID_SIMULATED' ? i18n.t("shipping:ui.riderPaidOnCollectionSimulationCustomerPaysCodOnDelivery") : i18n.t("shipping:ui.codCustomerPaysTheRiderOnDelivery")}</span>}
          {order.paymentMethod === 'BANK_TRANSFER' && <span>{i18n.t("shipping:ui.qrPrepayment")} {['PAID', 'COLLECTED'].includes(order.paymentStatus) ? i18n.t("shipping:ui.confirmed") : i18n.t("shipping:ui.awaitingConfirmation")} {i18n.t("shipping:ui.riderOnlyDeliversTheFood")}</span>}
          {!['COD', 'BANK_TRANSFER'].includes(order.paymentMethod) && <span>{i18n.t("shipping:ui.paymentMethodRequiresVerification")} {order.paymentMethod}</span>}
        </div>
      )}

      {/* 2. Bộ đếm thời gian chờ & Cảnh báo SLA */}
      <div className={styles.timeBanner}>
        <div className={styles.timeNormal}>
          <Clock3 size={14} />
          <span>
            {order.time ? `${order.time} · ` : ""}
            {elapsedTimeText}
          </span>
        </div>

        {showSlaBreached && (
          <span className={styles.slaAlertBadge} role="alert">
            <CircleAlert size={14} /> {t("business:staffcard.overdue", { count: diffMinutes })}
          </span>
        )}

        {showSlaWarning && (
          <span className={styles.slaWarningBadge}>
            <CircleAlert size={13} /> {t("business:staffcard.urgent", { count: diffMinutes })}
          </span>
        )}
      </div>

      {/* Thông tin khách hàng */}
      <div className={styles.customerInfo}>
        <span className={styles.customerName}>
          {order.customerName || t("business:staffcard.walkInCustomer")}
        </span>
        {order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            className={styles.customerPhone}
            tabIndex={0}
            aria-label={"Gọi khách hàng " + order.customerPhone}
          >
            {order.customerPhone}
          </a>
        )}
      </div>

      {/* 3. Body: Danh sách món kèm tùy chọn options */}
      <div className={styles.itemsList}>
        {order.items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemMain}>
              <span>
                <strong className={styles.itemQuantity}>{item.quantity}x</strong>
                <span className={styles.itemName}>{item.itemName}</span>
              </span>
              <span className={styles.itemTotal}>
                {formatMoney(item.lineTotal || item.unitPrice * item.quantity)}
              </span>
            </div>

            {item.options && (
              <div className={styles.itemOptions}>{item.options}</div>
            )}
          </div>
        ))}
      </div>

      {/* Ghi chú khách hàng */}
      {order.note && (
        <div className={styles.noteBox} role="note">
          <MessageSquare size={14} />
          <span className={styles.noteText}>{order.note}</span>
        </div>
      )}

      {/* 4. Footer Thẻ */}
      <div className={styles.cardFooter}>
        {/* Phân tách rõ ràng Trạng thái bếp & Trạng thái tiền */}
        <div className={styles.statusRow}>
          {renderKitchenStatus()}
          {renderPaymentStatus()}
        </div>

        {/* Tổng tiền */}
        <div className={styles.totalRow}>
          <span>{t("business:staffcard.total")}:</span>
          <strong className={styles.totalAmount}>
            {formatMoney(order.total)}
          </strong>
        </div>

        {/* Các nút bấm thao tác (đạt chuẩn chiều cao >= 48px) */}
        <div className={styles.actionButtons}>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.btnSecondary}`}
            onClick={() => onViewDetails?.(order.id)}
            aria-label={"Xem chi tiết đơn " + formattedQueue}
            title="Xem chi tiết"
          >
            <Eye size={18} />
          </button>

          {/* Theo từng trạng thái xử lý đơn */}
          {order.status === "PENDING_PAYMENT" && order.orderSource !== "WEB" && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.btnWarning}`}
              onClick={() => onPaymentCollect?.(order)}
              aria-label={"Thu tiền đơn " + formattedQueue}
            >
              <Wallet size={18} /> {t("business:staffcard.collectCounter")}
            </button>
          )}
          {order.status === "PENDING_PAYMENT" && order.orderSource === "WEB" && (
            <button type="button" className={`${styles.actionButton} ${styles.btnSecondary}`}
              onClick={() => onViewDetails?.(order.id)}>
              <Clock3 size={18} /> {t("business:staffcard.awaitingQr")}
            </button>
          )}

          {order.status === "CONFIRMED" && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              onClick={() => onStatusChange?.(order.id, "PREPARING")}
              aria-label={"Bắt đầu nấu đơn " + formattedQueue}
            >
              <ChefHat size={18} /> {t("business:staffcard.startCooking")}
            </button>
          )}

          {order.status === "PREPARING" && (
            <>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSuccess}`}
                onClick={() => onStatusChange?.(order.id, "READY")}
                aria-label={"Báo xong món đơn " + formattedQueue}
              >
                <PackageCheck size={18} /> {t("business:staffcard.foodReady")}
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onPrintKot?.(order)}
                title={t("business:staffcard.printKot")}
              >
                <Printer size={18} /> {t("business:staffcard.printKot")}
              </button>
            </>
          )}

          {order.status === "READY" && (
            <>
              {order.orderType === 'DELIVERY' ? (
                <button type="button" className={`${styles.actionButton} ${styles.btnSecondary}`} onClick={() => onViewDetails?.(order.id)}>
                  <Truck size={18} /> {i18n.t("shipping:ui.viewDelivery")}
                </button>
              ) : order.paymentStatus === "PENDING" ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.btnWarning}`}
                  onClick={() => onPaymentCollect?.(order)}
                  aria-label={t("business:pickupFlow.collect", { code: formattedQueue })}
                >
                  <Wallet size={18} /> {t("business:staffcard.collectCounter")}
                </button>
              ) : ["PAID", "COLLECTED"].includes(order.paymentStatus) ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.btnSuccess}`}
                  onClick={() => onStatusChange?.(order.id, "COMPLETED")}
                  aria-label={"Bàn giao đơn " + formattedQueue}
                >
                  <CheckCircle2 size={18} /> {fulfillment === 'DINE_IN' ? i18n.t("shipping:ui.customerCollectedFoodAtTheCounter") : t("business:pickupFlow.handover")}
                </button>
              ) : null}
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onReprint?.(order)}
                title="In lại hóa đơn / Xem bill"
              >
                <Printer size={18} /> {t("business:staffcard.reprintReceipt")}
              </button>
            </>
          )}

          {order.status === 'SHIPPING' && order.orderType === 'DELIVERY' && (
            <button type="button" className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={() => onViewDetails?.(order.id)}>
              <Truck size={18} /> {tracking?.status === 'FAILED' ? i18n.t("shipping:ui.handleFailedDelivery") : i18n.t("shipping:ui.trackReportFailedDelivery")}
            </button>
          )}

          {order.status === "COMPLETED" && (
            <>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onReprint?.(order)}
                title="In lại hóa đơn có watermark bản sao"
              >
                <Printer size={18} /> {t("business:staffcard.reprintReceipt")}
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onViewDetails?.(order.id)}
                aria-label={"Xem lại hóa đơn " + formattedQueue}
              >
                <CheckCircle2 size={18} /> {t("business:staffcard.completed")}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
