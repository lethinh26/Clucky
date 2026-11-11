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
} from "lucide-react";
import type { StaffOrder } from "../../../mocks/mockStaffOrders";
import type { AdminOrderStatus } from "../../../types/order";
import { useElapsedTime } from "../../../hooks/useElapsedTime";
import styles from "./order-card.module.css";

interface OrderCardProps {
  order: StaffOrder;
  onStatusChange?: (orderId: string, nextStatus: AdminOrderStatus) => void;
  onPaymentCollect?: (order: StaffOrder) => void;
  onViewDetails?: (orderId: string) => void;
  onReprint?: (order: StaffOrder) => void;
  formatMoney?: (val: number) => string;
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
  formatMoney = defaultFormatMoney,
}) => {
  const { elapsedTimeText, isSlaBreached, isSlaWarning, diffMinutes } =
    useElapsedTime(order.createdAt);

  // SLA chỉ áp dụng khi đơn đang chờ chế biến (CONFIRMED hoặc PREPARING)
  const isCookingStage =
    order.status === "CONFIRMED" || order.status === "PREPARING";
  const showSlaBreached = isCookingStage && isSlaBreached;
  const showSlaWarning = isCookingStage && isSlaWarning && !isSlaBreached;

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
            <Clock3 size={13} /> Chờ tiền
          </span>
        );
      case "CONFIRMED":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenConfirmed}`}>
            <ChefHat size={13} /> Chờ nhận món
          </span>
        );
      case "PREPARING":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenPreparing}`}>
            <ChefHat size={13} /> Đang nấu
          </span>
        );
      case "READY":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenReady}`}>
            <PackageCheck size={13} /> Sẵn sàng giao
          </span>
        );
      case "COMPLETED":
        return (
          <span className={`${styles.badgeKitchen} ${styles.badgeKitchenCompleted}`}>
            <CheckCircle2 size={13} /> Đã hoàn tất
          </span>
        );
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
    if (order.paymentStatus === "PAID") {
      return (
        <span className={`${styles.badgePayment} ${styles.badgePaymentPaid}`}>
          <CheckCircle2 size={13} /> ĐÃ THANH TOÁN ONLINE
        </span>
      );
    }
    if (order.paymentStatus === "COLLECTED") {
      return (
        <span className={`${styles.badgePayment} ${styles.badgePaymentCollected}`}>
          <Wallet size={13} /> ĐÃ THU TẠI QUẦY
        </span>
      );
    }
    return (
      <span className={`${styles.badgePayment} ${styles.badgePaymentPending}`}>
        <Wallet size={13} /> CHƯA THU TIỀN
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
            {order.diningOption === "DINE_IN" ? (
              <span className={styles.badgeDiningIn}>
                <Utensils size={12} /> ĂN TẠI QUÁN
              </span>
            ) : (
              <span className={styles.badgeTakeAway}>
                <ShoppingBag size={12} /> MANG VỀ
              </span>
            )}

            {order.orderSource === "COUNTER" ? (
              <span className={styles.badgeSourceCounter}>
                <Store size={11} /> QUẦY
              </span>
            ) : (
              <span className={styles.badgeSourceWeb}>
                <Globe size={11} /> WEB
              </span>
            )}
          </div>
        </div>
      </div>

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
            <CircleAlert size={14} /> QUÁ HẠN: {diffMinutes} PHÚT
          </span>
        )}

        {showSlaWarning && (
          <span className={styles.slaWarningBadge}>
            <CircleAlert size={13} /> CẦN GẤP ({diffMinutes}p)
          </span>
        )}
      </div>

      {/* Thông tin khách hàng */}
      <div className={styles.customerInfo}>
        <span className={styles.customerName}>
          {order.customerName || "Khách vãng lai"}
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
          <span>Tổng thanh toán:</span>
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
          {order.status === "PENDING_PAYMENT" && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.btnWarning}`}
              onClick={() => onPaymentCollect?.(order)}
              aria-label={"Thu tiền đơn " + formattedQueue}
            >
              <Wallet size={18} /> Thu tiền quầy
            </button>
          )}

          {order.status === "CONFIRMED" && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              onClick={() => onStatusChange?.(order.id, "PREPARING")}
              aria-label={"Bắt đầu nấu đơn " + formattedQueue}
            >
              <ChefHat size={18} /> Bắt đầu nấu
            </button>
          )}

          {order.status === "PREPARING" && (
            <button
              type="button"
              className={`${styles.actionButton} ${styles.btnSuccess}`}
              onClick={() => onStatusChange?.(order.id, "READY")}
              aria-label={"Báo xong món đơn " + formattedQueue}
            >
              <PackageCheck size={18} /> Đã xong món
            </button>
          )}

          {order.status === "READY" && (
            <>
              {order.paymentStatus === "PENDING" ? (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.btnWarning}`}
                  onClick={() => onPaymentCollect?.(order)}
                  aria-label={"Thu tiền và bàn giao đơn " + formattedQueue}
                >
                  <Wallet size={18} /> Đã thu tiền & bàn giao
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.btnSuccess}`}
                  onClick={() => onStatusChange?.(order.id, "COMPLETED")}
                  aria-label={"Bàn giao đơn " + formattedQueue}
                >
                  <CheckCircle2 size={18} /> Bàn giao cho khách
                </button>
              )}
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onReprint?.(order)}
                title="In lại hóa đơn / Xem bill"
              >
                <Printer size={18} /> In lại bill
              </button>
            </>
          )}

          {order.status === "COMPLETED" && (
            <>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onReprint?.(order)}
                title="In lại hóa đơn có watermark bản sao"
              >
                <Printer size={18} /> In lại bill
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.btnSecondary}`}
                onClick={() => onViewDetails?.(order.id)}
                aria-label={"Xem lại hóa đơn " + formattedQueue}
              >
                <CheckCircle2 size={18} /> Đã hoàn tất ca
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
