import React, { useState } from 'react';
import { Tag, Badge, Button, Input, Modal, message } from 'antd';
import {
  BellOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CoffeeOutlined,
  DollarOutlined,
  EditOutlined,
  FireOutlined,
  LoginOutlined,
  LogoutOutlined,
  ShopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { AdminOrder, AdminOrderStatus } from '../../types/order';
import { MOCK_ADMIN_ORDERS } from '../../mocks/adminOrderData';
import styles from './staff-orders.module.css';

// ponytail: storeId của Staff lấy từ JWT khi có auth thật; mock cố định chi nhánh được gán.
const STAFF_STORE = { id: '1', name: 'Nguyễn Trãi (Quận 5)' };

const STATUS_VIEW: Record<AdminOrderStatus, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'default' },
  CONFIRMED: { label: 'Chờ nấu', color: 'blue' },
  PREPARING: { label: 'Đang chế biến', color: 'orange' },
  READY: { label: 'Sẵn sàng', color: 'gold' },
  SHIPPING: { label: 'Đã chuyển đối tác giao', color: 'cyan' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
};

const money = (v: number) => `${new Intl.NumberFormat('vi-VN').format(v)}đ`;

// Nhóm chốt: Staff được hủy tới hết PREPARING, bắt buộc lý do (FR-STF-04).
const canCancel = (o: AdminOrder) => ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING'].includes(o.status);
const isPaidOnline = (o: AdminOrder) => o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'PAID';
const isCodCollected = (o: AdminOrder) => o.paymentMethod === 'COD' && o.paymentStatus === 'COLLECTED';

export const StaffOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>(MOCK_ADMIN_ORDERS);
  const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  // ponytail: check-in giữ ở state; nối API ca trực khi BE có endpoint check-in/out.
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  // Backend ép storeId; frontend chỉ hiển thị đơn của quán được gán.
  const branchOrders = orders.filter((o) => o.storeId === STAFF_STORE.id);

  const patchOrder = (id: string, patch: Partial<AdminOrder>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const updateStatus = (order: AdminOrder, status: AdminOrderStatus) => {
    patchOrder(order.id, { status });
    message.success(`Đơn ${order.orderCode}: ${STATUS_VIEW[status].label}`);
  };

  const confirmCod = (order: AdminOrder) => {
    patchOrder(order.id, { paymentStatus: 'COLLECTED' });
    message.success(`Đã ghi nhận thu ${money(order.total)} tiền mặt`);
  };

  const reportMismatch = (order: AdminOrder) =>
    message.info(`Đã báo sai lệch thanh toán đơn ${order.orderCode} cho Quản lý chi nhánh`);

  const submitCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    const paid = isPaidOnline(cancelTarget);
    patchOrder(cancelTarget.id, {
      status: 'CANCELLED',
      note: `${cancelTarget.note ? `${cancelTarget.note} · ` : ''}Hủy tại quán: ${cancelReason.trim()}`,
      // Đơn đã chuyển khoản: Staff chỉ tạo yêu cầu hoàn, Manager/Admin duyệt.
      ...(paid && { paymentStatus: 'REFUND_PENDING' as const, hasRefundRequest: true, refundReason: cancelReason.trim(), refundAmount: cancelTarget.total }),
    });
    message.success(paid ? 'Đã hủy đơn và gửi yêu cầu hoàn tiền cho Quản lý' : 'Đã hủy đơn');
    setCancelTarget(null);
    setCancelReason('');
  };

  const count = (s: AdminOrderStatus) => branchOrders.filter((o) => o.status === s).length;
  const uncollectedCod = branchOrders.filter(
    (o) => o.paymentMethod === 'COD' && !isCodCollected(o) && o.status !== 'CANCELLED'
  ).length;

  const renderActions = (order: AdminOrder) => {
    // COD giao hàng chưa vận hành ở MVP nên COD chỉ thu tại quầy khi khách đến lấy.
    const needCod = order.paymentMethod === 'COD' && !isCodCollected(order);

    switch (order.status) {
      case 'PENDING_PAYMENT':
        return <p className={styles.waitNote}><ClockCircleOutlined /> Chờ hệ thống đối soát chuyển khoản, chưa được nấu.</p>;
      case 'CONFIRMED':
        return (
          <button type="button" onClick={() => updateStatus(order, 'PREPARING')} className={`${styles.statusBtn} ${styles.btnPrepare}`}>
            <FireOutlined /> Bắt đầu nấu
          </button>
        );
      case 'PREPARING':
        return (
          <button type="button" onClick={() => updateStatus(order, 'READY')} className={`${styles.statusBtn} ${styles.btnReady}`}>
            <BellOutlined /> Báo xong món
          </button>
        );
      case 'READY':
        if (order.orderType === 'DELIVERY') {
          // Giao hàng do đối tác thứ 3 (GrabFood/ShopeeFood) đảm nhận; Staff chỉ bàn giao món.
          return (
            <button type="button" onClick={() => updateStatus(order, 'SHIPPING')} className={`${styles.statusBtn} ${styles.btnComplete}`}>
              <CarOutlined /> Bàn giao đối tác giao hàng
            </button>
          );
        }
        return (
          <button
            type="button"
            disabled={needCod}
            title={needCod ? 'Cần xác nhận thu tiền mặt trước' : undefined}
            onClick={() => updateStatus(order, 'COMPLETED')}
            className={`${styles.statusBtn} ${styles.btnComplete}`}
          >
            <CheckOutlined /> Khách đã nhận món
          </button>
        );
      case 'SHIPPING':
        return <p className={styles.waitNote}><CarOutlined /> Đối tác đang giao. Đơn tự hoàn thành khi đối tác báo đã giao.</p>;
      default:
        return null;
    }
  };

  return (
    <div className={styles.staffContainer}>
      <div className={styles.shiftHeader}>
        <div>
          <h1 className={styles.branchTitle}>Ca trực hôm nay</h1>
          <p className={styles.branchSub}>Tiếp nhận, chế biến và bàn giao đơn của chi nhánh được phân công.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={styles.storeChip}><ShopOutlined /> {STAFF_STORE.name}</span>
          {checkedInAt ? (
            <Button icon={<LogoutOutlined />} onClick={() => { setCheckedInAt(null); message.success('Đã kết thúc ca'); }}>
              Kết thúc ca (vào lúc {checkedInAt})
            </Button>
          ) : (
            <Button type="primary" icon={<LoginOutlined />} onClick={() => { setCheckedInAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })); message.success('Đã check-in ca'); }}>
              Check-in ca
            </Button>
          )}
        </div>
      </div>

      {!checkedInAt && (
        <p className={styles.waitNote} style={{ marginBottom: 20 }}>
          <ClockCircleOutlined /> Check-in ca để bắt đầu xử lý đơn. Trước khi check-in chỉ được xem.
        </p>
      )}

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}><ClockCircleOutlined /> Chờ nấu</span>
          <span className={`${styles.metricVal} ${count('CONFIRMED') > 0 ? styles.metricHighlight : ''}`}>{count('CONFIRMED')}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}><CoffeeOutlined /> Đang chế biến</span>
          <span className={styles.metricVal} style={{ color: '#d97706' }}>{count('PREPARING')}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}><CheckCircleOutlined /> Sẵn sàng</span>
          <span className={styles.metricVal} style={{ color: '#1e7a46' }}>{count('READY')}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}><DollarOutlined /> COD chưa thu</span>
          <span className={styles.metricVal} style={{ color: '#8f1216' }}>{uncollectedCod}</span>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {branchOrders.map((order) => {
          const view = STATUS_VIEW[order.status];
          const isUrgent = order.status === 'CONFIRMED' || order.status === 'PREPARING';
          const closed = order.status === 'COMPLETED' || order.status === 'CANCELLED';

          return (
            <article key={order.id} className={`${styles.orderCard} ${isUrgent ? styles.orderCardUrgent : ''}`}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.orderCode}>{order.orderCode}</span>
                  <div className={styles.orderTime}>{order.time}</div>
                </div>
                <Tag color={view.color} style={{ fontWeight: 700, borderRadius: 999 }}>{view.label}</Tag>
              </div>

              <div className={styles.customerRow}>
                <div>
                  <div className={styles.customerName}>{order.customerName}</div>
                  <div style={{ fontSize: 12, color: '#6b6259' }}>{order.customerPhone}</div>
                  {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                    <div style={{ fontSize: 12, color: '#6b6259' }}>{order.deliveryAddress}</div>
                  )}
                </div>
                <span className={styles.orderTypeBadge}>
                  {order.orderType === 'DELIVERY' ? <><CarOutlined /> Giao hàng</> : <><ShopOutlined /> Nhận tại quầy</>}
                </span>
              </div>

              <div className={styles.itemsBox}>
                {order.items.map((item) => (
                  <div key={item.id} className={styles.itemLine}>
                    <div>
                      <span className={styles.itemName}>{item.itemName} x{item.quantity}</span>
                      {item.options && <div className={styles.itemNote}>{item.options}</div>}
                    </div>
                    <strong style={{ color: '#16100d' }}>{money(item.lineTotal)}</strong>
                  </div>
                ))}
                {order.note && (
                  <div className={styles.orderNote}><EditOutlined /> <em>{order.note}</em></div>
                )}
              </div>

              <div className={styles.cardFooter}>
                {(order.shippingFee > 0 || order.discount > 0) && (
                  <div className={styles.costBreakdown}>
                    <div><span>Tạm tính</span><span>{money(order.subtotal)}</span></div>
                    {order.shippingFee > 0 && <div><span>Phí giao hàng</span><span>{money(order.shippingFee)}</span></div>}
                    {order.discount > 0 && <div><span>Giảm giá</span><span>-{money(order.discount)}</span></div>}
                  </div>
                )}
                <div className={styles.priceAndPay}>
                  <div>
                    <span style={{ fontSize: 12, color: '#6b6259' }}>Thanh toán: </span>
                    {order.paymentMethod === 'BANK_TRANSFER' ? (
                      order.paymentStatus === 'REFUND_PENDING' ? (
                        <Badge status="processing" text="VietQR chờ hoàn tiền" />
                      ) : order.paymentStatus === 'REFUNDED' ? (
                        <Badge status="default" text="VietQR đã hoàn tiền" />
                      ) : (
                        <Badge status={isPaidOnline(order) ? 'success' : 'warning'} text={isPaidOnline(order) ? 'VietQR đã đối soát' : 'VietQR chờ đối soát'} />
                      )
                    ) : (
                      <Badge status={isCodCollected(order) ? 'success' : 'warning'} text={isCodCollected(order) ? 'COD đã thu' : 'COD chưa thu'} />
                    )}
                  </div>
                  <span className={styles.totalPrice}>{money(order.total)}</span>
                </div>

                {order.hasRefundRequest && (
                  <p className={styles.waitNote}><WarningOutlined /> Yêu cầu hoàn tiền đang chờ Quản lý duyệt.</p>
                )}

                {checkedInAt && !closed && order.paymentMethod === 'COD' && order.orderType === 'PICKUP' && !isCodCollected(order) && order.status === 'READY' && (
                  <button type="button" onClick={() => confirmCod(order)} className={styles.codBtn}>
                    <DollarOutlined /> Xác nhận đã thu {money(order.total)}
                  </button>
                )}

                {checkedInAt && !closed && (
                  <div className={styles.actionBtns}>
                    {renderActions(order)}
                    {canCancel(order) && (
                      <button type="button" onClick={() => setCancelTarget(order)} className={`${styles.statusBtn} ${styles.btnCancel}`}>
                        <CloseCircleOutlined /> Từ chối đơn
                      </button>
                    )}
                    {order.paymentMethod === 'BANK_TRANSFER' && (
                      <button type="button" onClick={() => reportMismatch(order)} className={styles.linkBtn}>
                        <WarningOutlined /> Báo sai lệch thanh toán
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        title={`Từ chối đơn ${cancelTarget?.orderCode ?? ''}`}
        open={!!cancelTarget}
        okText="Xác nhận hủy"
        cancelText="Quay lại"
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        onOk={submitCancel}
        onCancel={() => { setCancelTarget(null); setCancelReason(''); }}
      >
        <p style={{ color: '#6b6259' }}>
          Lý do là bắt buộc và được ghi vào nhật ký thao tác.
          {cancelTarget && isPaidOnline(cancelTarget) && ' Đơn đã chuyển khoản sẽ tự tạo yêu cầu hoàn tiền chờ Quản lý duyệt.'}
        </p>
        <Input.TextArea
          rows={3}
          maxLength={255}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Ví dụ: Hết gà nguyên liệu, quán quá tải..."
          aria-label="Lý do từ chối đơn"
        />
      </Modal>
    </div>
  );
};
