import React, { useState } from 'react';
import { Tag, Badge, Select, message } from 'antd';
import { CoffeeOutlined, CheckCircleOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { AdminOrder, AdminOrderStatus } from '../../types/order';
import { MOCK_ADMIN_ORDERS } from '../../mocks/adminOrderData';
import styles from './staff-orders.module.css';

export const StaffOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>(MOCK_ADMIN_ORDERS);
  const [currentStoreId, setCurrentStoreId] = useState<string>('1');

  // Filter orders by staff's storeId
  const branchOrders = orders.filter((o) => o.storeId === currentStoreId);

  const handleUpdateStatus = (orderId: string, newStatus: AdminOrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    message.success('Đã cập nhật trạng thái đơn thành công!');
  };

  const handleConfirmCOD = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o))
    );
    message.success('Đã xác nhận thu tiền mặt (COD) thành công!');
  };

  // Metrics
  const pendingCount = branchOrders.filter((o) => o.status === 'CONFIRMED').length;
  const preparingCount = branchOrders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = branchOrders.filter((o) => o.status === 'READY').length;
  const uncollectedCodCount = branchOrders.filter(
    (o) => o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID'
  ).length;

  return (
    <div className={styles.staffContainer}>
      {/* Shift & Branch Header */}
      <div className={styles.shiftHeader}>
        <div>
          <h1 className={styles.branchTitle}>Màn hình Tác nghiệp Ca trực — Nhân viên</h1>
          <p className={styles.branchSub}>
            Tiếp nhận, xử lý đơn hàng và thu ngân tiền mặt tại chi nhánh hôm nay.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Chi nhánh hiện tại:</span>
          <Select
            value={currentStoreId}
            onChange={setCurrentStoreId}
            style={{ width: 220 }}
            options={[
              { value: '1', label: 'Quán Nguyễn Trãi (Quận 5)' },
              { value: '2', label: 'Quán Phan Văn Trị (Bình Thạnh)' },
              { value: '3', label: 'Quán Lê Văn Việt (Thủ Đức)' },
            ]}
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>
            <ClockCircleOutlined /> Đơn mới chờ nấu
          </span>
          <span className={`${styles.metricVal} ${pendingCount > 0 ? styles.metricHighlight : ''}`}>
            {pendingCount}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>
            <CoffeeOutlined /> Đang chế biến
          </span>
          <span className={styles.metricVal} style={{ color: '#d97706' }}>
            {preparingCount}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>
            <CheckCircleOutlined /> Món sẵn sàng
          </span>
          <span className={styles.metricVal} style={{ color: '#1e7a46' }}>
            {readyCount}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>
            <DollarOutlined /> Đơn COD chưa thu
          </span>
          <span className={styles.metricVal} style={{ color: '#8f1216' }}>
            {uncollectedCodCount}
          </span>
        </div>
      </div>

      {/* Active Orders Cards Grid */}
      <div className={styles.cardsGrid}>
        {branchOrders.map((order) => {
          const isUrgent = order.status === 'CONFIRMED' || order.status === 'PREPARING';

          return (
            <article
              key={order.id}
              className={`${styles.orderCard} ${isUrgent ? styles.orderCardUrgent : ''}`}
            >
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.orderCode}>{order.orderCode}</span>
                  <div className={styles.orderTime}>{order.time}</div>
                </div>
                <Tag
                  color={
                    order.status === 'CONFIRMED'
                      ? 'blue'
                      : order.status === 'PREPARING'
                      ? 'orange'
                      : order.status === 'READY'
                      ? 'gold'
                      : order.status === 'SHIPPING'
                      ? 'cyan'
                      : order.status === 'COMPLETED'
                      ? 'green'
                      : 'red'
                  }
                  style={{ fontWeight: 700, borderRadius: 999 }}
                >
                  {order.status === 'CONFIRMED'
                    ? 'Chờ nấu'
                    : order.status === 'PREPARING'
                    ? 'Đang chiên nấu'
                    : order.status === 'READY'
                    ? 'Đã sẵn sàng'
                    : order.status === 'COMPLETED'
                    ? 'Hoàn thành'
                    : order.status}
                </Tag>
              </div>

              <div className={styles.customerRow}>
                <div>
                  <div className={styles.customerName}>{order.customerName}</div>
                  <div style={{ fontSize: 12, color: '#6b6259' }}>{order.customerPhone}</div>
                </div>
                <span className={styles.orderTypeBadge}>
                  {order.orderType === 'DELIVERY' ? '🛵 Giao hàng' : '🏪 Nhận tại quầy'}
                </span>
              </div>

              {/* Items List */}
              <div className={styles.itemsBox}>
                {order.items.map((item) => (
                  <div key={item.id} className={styles.itemLine}>
                    <div>
                      <span className={styles.itemName}>
                        {item.itemName} × {item.quantity}
                      </span>
                      {item.options && <div className={styles.itemNote}>{item.options}</div>}
                    </div>
                    <strong style={{ color: '#16100d' }}>
                      {new Intl.NumberFormat('vi-VN').format(item.lineTotal)}đ
                    </strong>
                  </div>
                ))}
                {order.note && (
                  <div
                    style={{
                      background: '#f5ede0',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#8f1216',
                      marginTop: 4,
                    }}
                  >
                    📝 <em>{order.note}</em>
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.priceAndPay}>
                  <div>
                    <span style={{ fontSize: 12, color: '#6b6259' }}>Thanh toán: </span>
                    <Badge
                      status={order.paymentStatus === 'PAID' ? 'success' : 'warning'}
                      text={
                        order.paymentMethod === 'BANK_TRANSFER'
                          ? 'VietQR (Đã thu)'
                          : order.paymentStatus === 'PAID'
                          ? 'COD (Đã thu tiền)'
                          : 'COD (Chưa thu)'
                      }
                    />
                  </div>
                  <span className={styles.totalPrice}>
                    {new Intl.NumberFormat('vi-VN').format(order.total)}đ
                  </span>
                </div>

                {/* COD confirmation button */}
                {order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmCOD(order.id)}
                    className={styles.codBtn}
                  >
                    💵 Xác nhận đã thu tiền mặt (
                    {new Intl.NumberFormat('vi-VN').format(order.total)}đ)
                  </button>
                )}

                {/* One-touch Status Pills */}
                <div className={styles.actionBtns}>
                  {order.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className={`${styles.statusBtn} ${styles.btnPrepare}`}
                    >
                      🍳 Bắt đầu nấu
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className={`${styles.statusBtn} ${styles.btnReady}`}
                    >
                      🔔 Báo xong món
                    </button>
                  )}

                  {(order.status === 'READY' || order.status === 'SHIPPING') && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                      className={`${styles.statusBtn} ${styles.btnComplete}`}
                    >
                      ✓ Hoàn thành đơn
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
