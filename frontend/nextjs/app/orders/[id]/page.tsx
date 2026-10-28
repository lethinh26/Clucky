'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { formatPrice } from '@/lib/products';
import { MOCK_ORDERS } from '@/lib/mock/order-mock-data';
import { OrderStatusChip, OrderItemCard, OrderSummaryCard } from '@/components/order';
import styles from './tracking.module.css';

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // Find order or fallback to demo order
  const initialOrder = MOCK_ORDERS.find((o) => o.id === id || o.orderCode === id) || MOCK_ORDERS[0];
  const [order, setOrder] = useState(initialOrder);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) return;
    setOrder((prev) => ({
      ...prev,
      status: 'CANCELLED',
      timeline: [
        ...prev.timeline,
        {
          status: 'CANCELLED',
          title: 'Đã hủy đơn hàng',
          description: `Lý do: ${cancelReason}`,
          time: 'Vừa xong',
          done: true,
          current: true,
        },
      ],
    }));
    setIsCancelModalOpen(false);
  };

  const isBankTransferPending =
    order.paymentMethod === 'BANK_TRANSFER' &&
    order.status === 'PENDING_PAYMENT';

  return (
    <>
      <CustomerHeader />
      <main className={styles.trackingContainer}>
        <Link href="/orders" className={styles.backLink}>
          ← Danh sách đơn hàng của bạn
        </Link>

        <div className={styles.orderHeader}>
          <div>
            <span className={styles.orderCode}>Mã đơn hàng: {order.orderCode}</span>
            <h1 className={styles.title}>
              {order.status === 'COMPLETED'
                ? 'Đơn hàng đã hoàn thành 🎉'
                : order.status === 'CANCELLED'
                ? 'Đơn hàng đã bị hủy'
                : 'Đơn đang được chuẩn bị 🍗'}
            </h1>
            <p className={styles.orderSub}>
              Đặt lúc: {order.createdAt} · Chi nhánh: {order.storeName}
            </p>
          </div>
          <OrderStatusChip status={order.status} />
        </div>

        <div className={styles.trackingGrid}>
          {/* Left Column: Timeline & Items */}
          <div>
            {/* Timeline */}
            <section className={styles.timelineCard}>
              <h2 className={styles.cardTitle}>Tiến trình đơn hàng</h2>
              <div className={styles.timelineList}>
                {order.timeline.map((step, idx) => (
                  <div
                    key={`step-${idx}`}
                    className={`${styles.timelineItem} ${
                      step.done ? styles.timelineItemDone : ''
                    } ${step.current ? styles.timelineItemCurrent : ''}`}
                  >
                    <div className={styles.timelineIcon}>
                      {step.done && !step.current ? '✓' : idx + 1}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHead}>
                        <h3 className={styles.stepTitle}>{step.title}</h3>
                        {step.time && <span className={styles.stepTime}>{step.time}</span>}
                      </div>
                      <p className={styles.stepDesc}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Items Breakdown */}
            <section className={styles.orderDetailCard}>
              <h2 className={styles.cardTitle}>Chi tiết các món ({order.items.length})</h2>
              <div className={styles.itemsList}>
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

              <OrderSummaryCard
                subtotal={order.subtotal}
                discountAmount={order.discountAmount}
                voucherCode={order.voucherCode}
                pointsUsed={order.pointsUsed}
                pointsAmount={order.pointsAmount}
                shippingFee={order.shippingFee}
                totalAmount={order.totalAmount}
              />
            </section>
          </div>

          {/* Right Column: Payment Widget (VietQR) & Receiver Info */}
          <aside>
            {/* VietQR Payment Block (Contract slot with M4) */}
            {isBankTransferPending && (
              <div className={styles.paymentWidget}>
                <span className={styles.qrBadge}>Quét mã thanh toán</span>
                <h3 className={styles.qrTitle}>Chuyển khoản VietQR</h3>
                <p className={styles.qrTimer}>⏱ Hết hạn sau 14:32</p>

                <div className={styles.qrImageWrapper}>
                  {/* Dynamic VietQR placeholder with simulated payload */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=240826-${order.totalAmount}-CLUCKY`}
                    alt="VietQR thanh toán Clucky"
                    className={styles.qrImage}
                  />
                </div>

                <div className={styles.bankDetails}>
                  <div className={styles.bankRow}>
                    <span>Ngân hàng:</span>
                    <strong>MB Bank</strong>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Số tài khoản:</span>
                    <strong>0909123456789</strong>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Chủ tài khoản:</span>
                    <strong>CLUCKY VIETNAM</strong>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Số tiền:</span>
                    <strong style={{ color: '#8f1216' }}>{formatPrice(order.totalAmount)}</strong>
                  </div>
                  <div className={styles.bankRow}>
                    <span>Nội dung:</span>
                    <strong style={{ color: '#8f1216' }}>{order.orderCode}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Receiver & Delivery Information */}
            <div className={styles.infoBox}>
              <h3 className={styles.cardTitle} style={{ margin: 0, fontSize: 18 }}>
                Thông tin nhận hàng
              </h3>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Người nhận</span>
                <p className={styles.infoVal}>
                  {order.receiverName} ({order.receiverPhone})
                </p>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Hình thức</span>
                <p className={styles.infoVal}>
                  {order.type === 'DELIVERY' ? '🛵 Giao tận nơi' : '🏪 Nhận tại cửa hàng'}
                </p>
              </div>

              {order.deliveryAddress && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Địa chỉ giao</span>
                  <p className={styles.infoVal}>{order.deliveryAddress}</p>
                </div>
              )}

              {order.note && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ghi chú đơn</span>
                  <p className={styles.infoVal}>{order.note}</p>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Phương thức thanh toán</span>
                <p className={styles.infoVal}>
                  {order.paymentMethod === 'BANK_TRANSFER'
                    ? 'Chuyển khoản VietQR'
                    : 'Thanh toán tiền mặt (COD)'}
                </p>
              </div>

              {/* Cancel Button only available if not yet PREPARING */}
              {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className={styles.cancelBtn}
                >
                  Hủy đơn hàng này
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* Modal Hủy Đơn */}
        {isCancelModalOpen && (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modalBox}>
              <h2 className={styles.modalTitle}>Xác nhận hủy đơn hàng?</h2>
              <p className={styles.modalDesc}>
                Theo quy định, đơn hàng chỉ có thể hủy trước khi bếp tiến hành chế biến. Vui lòng
                nhập lý do hủy:
              </p>
              <textarea
                placeholder="Nhập lý do hủy (bắt buộc)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={styles.modalTextarea}
                required
              />
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className={styles.modalCancelBtn}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className={styles.modalConfirmBtn}
                >
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <CustomerFooter />
    </>
  );
}
