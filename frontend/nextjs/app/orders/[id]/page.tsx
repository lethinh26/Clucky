"use client";

import { useState, use } from "react";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Wallet,
  CreditCard,
  CircleX,
  History,
  MessageSquare,
  CircleAlert,
} from "lucide-react";
import { formatPrice } from "@/lib/products";
import { displayOrderTime } from "@/lib/order-demo";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { OrderDialog } from "@/components/order/order-dialog";
import { DemoOrderControls } from "@/components/order/demo-order-controls";
import { PaymentWidget, PaymentStatusBadge } from "@/components/payment";
import { ShipmentCard } from "@/components/shipping";
import { MOCK_PAYMENT_BANK } from "@/lib/mock/payment-mock-data";
import {
  OrderStatusChip,
  OrderItemCard,
  OrderSummaryCard,
} from "@/components/order";
import styles from "./tracking.module.css";

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { orders, ready, cancelOrder, reorder, demoEnabled } =
    useOrder();
  useNavigationTask(!ready);
  const order = orders.find(
    (entry) => entry.id === id || entry.orderCode === id,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState("");
  if (!ready || !order)
    return (
      <>
        <main className={`${styles.trackingContainer} m3-page`}>
          {!ready ? (
            <div className="order-skeleton" aria-hidden="true" />
          ) : (
            <div className="order-empty">
              <PackageCheck size={44} />
              <h1>Không tìm thấy đơn hàng</h1>
              <p>Kiểm tra mã đơn hoặc quay lại lịch sử mua hàng.</p>
              <Link href="/orders" className="btn-primary">
                Xem đơn hàng của tôi
              </Link>
            </div>
          )}
        </main>
      </>
    );
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const awaitingPayment =
    order.paymentMethod === "BANK_TRANSFER" &&
    order.paymentStatus === "PENDING" &&
    order.status === "PENDING_PAYMENT";
  const terminal = ["COMPLETED", "CANCELLED"].includes(order.status);
  const paymentCopy = {
    PAID: {
      label: "Số tiền đã thanh toán",
      message: "Thanh toán của bạn đã được ghi nhận. Cảm ơn bạn đã chọn Clucky!",
      icon: CheckCircle2,
    },
    PENDING: {
      label: "Số tiền cần thanh toán",
      message: order.paymentMethod === "COD"
        ? "Bạn thanh toán bằng tiền mặt khi nhận món."
        : "Quét mã bên dưới để hoàn tất thanh toán.",
      icon: Wallet,
    },
    FAILED: {
      label: "Giá trị đơn hàng",
      message: "Thanh toán chưa thành công. Vui lòng kiểm tra lại trạng thái đơn hàng.",
      icon: CircleAlert,
    },
    EXPIRED: {
      label: "Giá trị đơn hàng",
      message: "Phiên thanh toán đã hết hạn. Vui lòng kiểm tra lại đơn hàng trước khi thanh toán.",
      icon: Clock3,
    },
  }[order.paymentStatus];
  const PaymentIcon = paymentCopy.icon;
  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    cancelOrder(order.id, cancelReason.trim());
    setCancelOpen(false);
    setFeedback("Đơn đã được hủy thành công.");
  };
  return (
    <>
      <main className={`${styles.trackingContainer} m3-page`}>
        <nav className={styles.breadcrumb} aria-label="Đường dẫn">
          <Link href="/orders">
            <ArrowLeft size={15} /> Đơn hàng của tôi
          </Link>
          <span>/</span>
          <span>{order.orderCode}</span>
        </nav>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.eyebrow}>BỮA NGON CỦA BẠN</span>
            <h1>Chi tiết đơn hàng</h1>
            <p>
              <Clock3 size={14} /> Đặt lúc {displayOrderTime(order.createdAt)}
              <span>·</span>
              {order.storeName}
            </p>
          </div>
          <OrderStatusChip status={order.status} />
        </header>
        <OrderProgress
          orderCode={order.orderCode}
          status={order.status}
          type={order.type}
          updatedAt={order.updatedAt ?? order.createdAt}
          history={order.timeline}
        />
        {feedback && (
          <p className={styles.feedback} role="status">
            <CheckCircle2 size={16} />
            {feedback}
          </p>
        )}
        <div
          className={`${styles.detailGrid} ${awaitingPayment ? styles.awaitingPayment : ""}`}
        >
          <div className={styles.detailMain}>
            <section className={styles.detailCard}>
              <div className={styles.sectionHeading}>
                <h2>
                  <ShoppingBag size={19} /> Món đã đặt
                </h2>
                <span>{itemCount} phần</span>
              </div>
              <div className={styles.detailItems}>
                {order.items.map((item) => (
                  <OrderItemCard
                    key={item.id}
                    image={item.image}
                    name={item.itemName}
                    unitPrice={item.unitPrice}
                    quantity={item.quantity}
                    lineTotal={item.lineTotal}
                    options={item.optionsSnapshot}
                    toppings={item.toppingsSnapshot}
                    note={item.note}
                  />
                ))}
              </div>
              {order.note && (
                <div className={styles.orderNote}>
                  <MessageSquare size={17} />
                  <div>
                    <strong>Ghi chú đơn hàng</strong>
                    <p>{order.note}</p>
                  </div>
                </div>
              )}
              <OrderSummaryCard
                embedded
                title="Tổng tiền"
                subtotal={order.subtotal}
                discountAmount={order.discountAmount}
                voucherCode={order.voucherCode}
                pointsUsed={order.pointsUsed}
                pointsAmount={order.pointsAmount}
                shippingFee={order.shippingFee}
                totalAmount={order.totalAmount}
              />
            </section>
            <div className={styles.detailActions}>
              {terminal ? (
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.exploreAction}`}
                  onClick={() => {
                    reorder(order);
                    router.push("/cart");
                  }}
                >
                  <RotateCcw size={17} />
                  Đặt lại những món này
                </button>
              ) : (
                <Link href="/menu" className={`${styles.primaryButton} ${styles.exploreAction}`}>
                  <ShoppingBag size={19} aria-hidden="true" />
                  Khám phá thêm món
                  <span className={styles.actionArrow} aria-hidden="true"><ArrowRight size={17} /></span>
                </Link>
              )}
              {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
                <button
                  type="button"
                  className={styles.cancelAction}
                  onClick={() => setCancelOpen(true)}
                >
                  <CircleX size={18} aria-hidden="true" /> Hủy đơn hàng này
                </button>
              )}
              <Link href="/orders" className={styles.textButton}>
                <History size={18} aria-hidden="true" /> Về lịch sử đơn
              </Link>
            </div>
          </div>
          <aside className={styles.detailAside}>
            <section
              className={`${styles.detailCard} ${styles.paymentCard}`}
              data-state={order.paymentStatus}
              aria-label="Thanh toán đơn hàng"
            >
              <div className={styles.paymentHeading}>
                <h2>
                  <Wallet size={19} /> Thanh toán
                </h2>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              {!awaitingPayment && (
                <div className={styles.paymentReceipt}>
                  <span className={styles.paymentEmblem} aria-hidden="true">
                    <PaymentIcon size={30} strokeWidth={1.8} />
                  </span>
                  <span className={styles.paymentAmountLabel}>{paymentCopy.label}</span>
                  <strong className={styles.paymentAmount}>{formatPrice(order.totalAmount)}</strong>
                  <p className={styles.paymentMessage}>{paymentCopy.message}</p>
                </div>
              )}
              <div className={styles.paymentMethod}>
                <span className={styles.paymentMethodIcon} aria-hidden="true">
                  {order.paymentMethod === "COD" ? <Wallet size={23} /> : <CreditCard size={23} />}
                </span>
                <div>
                  <span className={styles.paymentMethodLabel}>Phương thức thanh toán</span>
                  <strong>{order.paymentMethod === "COD" ? "Tiền mặt khi nhận món" : "Chuyển khoản ngân hàng"}</strong>
                </div>
                <span className={styles.paymentNetwork}>{order.paymentMethod === "COD" ? "COD" : "VietQR"}</span>
              </div>
              {awaitingPayment && (
                <PaymentWidget
                  key={order.id}
                  orderCode={order.orderCode}
                  amount={order.totalAmount}
                  status={order.paymentStatus}
                  bankInfo={MOCK_PAYMENT_BANK}
                  storeName={order.storeName}
                  embedded
                  demo
                />
              )}
              {order.refundStatus === "PENDING" && (
                <p className={styles.refundNotice}>
                  <CircleAlert size={16} />
                  Yêu cầu hoàn tiền đang chờ duyệt.
                </p>
              )}
            </section>
            <ShipmentCard
              receiverName={order.receiverName}
              receiverPhone={order.receiverPhone}
              address={order.deliveryAddress}
              storeName={order.storeName}
              orderType={order.type}
            />
          </aside>
        </div>
        {demoEnabled && (
          <details className={styles.demoDisclosure}>
            <summary>Mô phỏng trạng thái đơn hàng</summary>
            <DemoOrderControls order={order} />
          </details>
        )}
        <OrderDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          titleId="cancel-order-title"
        >
          <div className={styles.cancelDialog}>
            <h2 id="cancel-order-title">Hủy đơn hàng?</h2>
            <p>
              Đơn chỉ có thể hủy trước khi bếp chế biến. Nếu đã thanh toán
              chuyển khoản, yêu cầu hoàn tiền sẽ được tạo và xử lý.
            </p>
            <label htmlFor="cancel-reason">Lý do hủy *</label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Cho Clucky biết lý do của bạn…"
              maxLength={500}
            />
            <div>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setCancelOpen(false)}
              >
                Giữ đơn hàng
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!cancelReason.trim()}
                onClick={handleCancel}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </OrderDialog>
      </main>
    </>
  );
}
