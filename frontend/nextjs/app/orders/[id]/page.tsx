"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  Wallet,
  MessageSquare,
  CircleAlert,
} from "lucide-react";
import { formatPrice } from "@/lib/products";
import { displayOrderTime } from "@/lib/order-demo";
import { useOrder } from "@/components/order/order-provider";
import { OrderProgress } from "@/components/order/order-progress";
import { OrderDialog } from "@/components/order/order-dialog";
import { DemoOrderControls } from "@/components/order/demo-order-controls";
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
  const { orders, ready, cancelOrder, reorder, demoEnabled, startNavigating } = useOrder();
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
            <div className="order-skeleton" role="status">
              Đang tải đơn hàng…
            </div>
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
  const paymentLabel = {
    PENDING: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    FAILED: "Thanh toán thất bại",
    EXPIRED: "Đã hết hạn",
  }[order.paymentStatus];
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const terminal = ["COMPLETED", "CANCELLED"].includes(order.status);
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
        <div className={styles.overviewGrid}>
          <div>
            <ShoppingBag size={18} />
            <span>Số lượng món</span>
            <strong>{itemCount} phần ăn</strong>
          </div>
          <div>
            <CreditCard size={18} />
            <span>Tổng đơn hàng</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
          <div>
            {order.type === "PICKUP" ? (
              <Store size={18} />
            ) : (
              <Truck size={18} />
            )}
            <span>Nhận món</span>
            <strong>
              {order.type === "PICKUP" ? "Tại cửa hàng" : "Giao tận nơi"}
            </strong>
          </div>
        </div>
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
        <div className={styles.detailGrid}>
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
            </section>
            <OrderSummaryCard
              subtotal={order.subtotal}
              discountAmount={order.discountAmount}
              voucherCode={order.voucherCode}
              pointsUsed={order.pointsUsed}
              pointsAmount={order.pointsAmount}
              shippingFee={order.shippingFee}
              totalAmount={order.totalAmount}
            />
            <div className={styles.detailActions}>
              {terminal ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    reorder(order);
                    startNavigating?.("Đang chuyển tới giỏ hàng…");
                    router.push("/cart");
                  }}
                >
                  <RotateCcw size={17} />
                  Đặt lại những món này
                </button>
              ) : (
                <Link href="/menu" className={styles.outlineButton}>
                  Khám phá thêm món <ArrowRight size={16} />
                </Link>
              )}
              <Link href="/orders" className={styles.textButton}>
                Về lịch sử đơn
              </Link>
            </div>
          </div>
          <aside className={styles.detailAside}>
            <DemoOrderControls order={order} />
            <section className={styles.detailCard}>
              <h2>
                <Wallet size={19} /> Thanh toán
              </h2>
              <dl className={styles.infoList}>
                <div>
                  <dt>Phương thức</dt>
                  <dd>
                    {order.paymentMethod === "COD"
                      ? "Tiền mặt (COD)"
                      : "Chuyển khoản"}
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái</dt>
                  <dd
                    className={
                      order.paymentStatus === "PAID" ? styles.paid : ""
                    }
                  >
                    {paymentLabel}
                  </dd>
                </div>
                <div>
                  <dt>Mã đơn</dt>
                  <dd>{order.orderCode}</dd>
                </div>
              </dl>
              {order.refundStatus === "PENDING" && (
                <p className={styles.refundNotice}>
                  <CircleAlert size={16} />
                  Yêu cầu hoàn tiền đang chờ duyệt.
                </p>
              )}
            </section>
            <section className={styles.detailCard}>
              <h2>
                <UserRound size={19} /> Thông tin nhận món
              </h2>
              <dl className={styles.infoList}>
                <div>
                  <dt>Người nhận</dt>
                  <dd>{order.receiverName}</dd>
                </div>
                <div>
                  <dt>Điện thoại</dt>
                  <dd>
                    <a href={`tel:${order.receiverPhone}`}>
                      {order.receiverPhone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>
                    <MapPin size={13} />
                    {order.type === "PICKUP" ? "Chi nhánh" : "Địa chỉ giao"}
                  </dt>
                  <dd>
                    {order.type === "PICKUP"
                      ? order.storeName
                      : order.deliveryAddress}
                  </dd>
                </div>
                <div>
                  <dt>Chuẩn bị tại</dt>
                  <dd>{order.storeName}</dd>
                </div>
              </dl>
              {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setCancelOpen(true)}
                >
                  Hủy đơn hàng này
                </button>
              )}
            </section>
          </aside>
        </div>
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
