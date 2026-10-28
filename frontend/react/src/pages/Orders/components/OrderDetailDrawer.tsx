import React from 'react';
import { Drawer, Button, Tag, Space, Typography, Divider } from 'antd';
import { CarOutlined, ShopOutlined, WarningOutlined } from '@ant-design/icons';
import { AdminOrder } from '../../../types/order';
import styles from '../orders.module.css';

interface OrderDetailDrawerProps {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: AdminOrder['status']) => void;
  onOpenRefundModal: (order: AdminOrder) => void;
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'blue',
  PREPARING: 'orange',
  READY: 'gold',
  SHIPPING: 'cyan',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang nấu',
  READY: 'Sẵn sàng giao',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  open,
  onClose,
  onStatusChange,
  onOpenRefundModal,
}) => {
  if (!order) return null;

  return (
    <Drawer
      title={
        <Space>
          <span>Chi tiết đơn: {order.orderCode}</span>
          <Tag color={statusColors[order.status] ?? 'default'} className={styles.statusTag}>
            {statusLabels[order.status] ?? order.status}
          </Tag>
        </Space>
      }
      width={520}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          {order.hasRefundRequest && (
            <Button danger onClick={() => onOpenRefundModal(order)}>
              Duyệt hoàn tiền
            </Button>
          )}
        </Space>
      }
    >
      {order.hasRefundRequest && (
        <div className={styles.refundAlert}>
          <div className={styles.refundAlertTitle}><WarningOutlined /> Có yêu cầu hoàn tiền đang chờ duyệt</div>
          <p className={styles.refundAlertDesc}>
            Số tiền yêu cầu: <strong>{new Intl.NumberFormat('vi-VN').format(order.refundAmount || 0)}đ</strong>
            <br />
            Lý do: {order.refundReason}
          </p>
        </div>
      )}

      {/* Customer Info */}
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Khách hàng & Nhận hàng</div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Khách hàng:</span>
          <span className={styles.infoVal}>{order.customerName}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Số điện thoại:</span>
          <span className={styles.infoVal}>{order.customerPhone}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Hình thức:</span>
          <span className={styles.infoVal}>
            {order.orderType === 'DELIVERY' ? <><CarOutlined /> Giao tận nơi</> : <><ShopOutlined /> Nhận tại quầy</>}
          </span>
        </div>
        {order.deliveryAddress && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Địa chỉ giao:</span>
            <span className={styles.infoVal}>{order.deliveryAddress}</span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Chi nhánh xử lý:</span>
          <span className={styles.infoVal}>{order.storeName}</span>
        </div>
        {order.note && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ghi chú đơn:</span>
            <span className={styles.infoVal} style={{ color: '#8f1216' }}>
              {order.note}
            </span>
          </div>
        )}
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Items Breakdown */}
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Danh sách món ăn ({order.items.length})</div>
        <div className={styles.itemsList}>
          {order.items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <div>
                <div className={styles.itemTitle}>{item.itemName}</div>
                <div className={styles.itemSub}>
                  {new Intl.NumberFormat('vi-VN').format(item.unitPrice)}đ × {item.quantity} phần
                  {item.options && ` · ${item.options}`}
                </div>
              </div>
              <div className={styles.itemPrice}>
                {new Intl.NumberFormat('vi-VN').format(item.lineTotal)}đ
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Payment & Total */}
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Thanh toán</div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Hình thức:</span>
          <span className={styles.infoVal}>
            {order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Trạng thái thanh toán:</span>
          <Tag color={['PAID', 'COLLECTED'].includes(order.paymentStatus) ? 'green' : 'gold'}>
            {['PAID', 'COLLECTED'].includes(order.paymentStatus) ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </Tag>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Tạm tính:</span>
          <span className={styles.infoVal}>{new Intl.NumberFormat('vi-VN').format(order.subtotal)}đ</span>
        </div>
        {order.discount > 0 && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Giảm giá voucher:</span>
            <span className={styles.infoVal} style={{ color: '#1e7a46' }}>
              -{new Intl.NumberFormat('vi-VN').format(order.discount)}đ
            </span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Phí giao hàng:</span>
          <span className={styles.infoVal}>
            {new Intl.NumberFormat('vi-VN').format(order.shippingFee)}đ
          </span>
        </div>
        <div className={styles.infoRow} style={{ marginTop: 12 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Tổng thanh toán:
          </Typography.Title>
          <span className={styles.moneyText} style={{ fontSize: 22 }}>
            {new Intl.NumberFormat('vi-VN').format(order.total)}đ
          </span>
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Quick Status Action Controls */}
      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionTitle}>Thao tác trạng thái đơn</div>
        <Space wrap>
          {order.status === 'CONFIRMED' && (
            <Button
              type="primary"
              style={{ background: '#d97706', borderColor: '#d97706' }}
              onClick={() => onStatusChange(order.id, 'PREPARING')}
            >
              Chuyển sang Đang nấu
            </Button>
          )}
          {order.status === 'PREPARING' && (
            <Button
              type="primary"
              style={{ background: '#c9a227', borderColor: '#c9a227' }}
              onClick={() => onStatusChange(order.id, 'READY')}
            >
              Báo món Đã sẵn sàng
            </Button>
          )}
          {order.status === 'READY' && order.orderType === 'DELIVERY' && (
            <Button
              type="primary"
              style={{ background: '#22577a', borderColor: '#22577a' }}
              onClick={() => onStatusChange(order.id, 'SHIPPING')}
            >
              Giao cho tài xế (Đang giao)
            </Button>
          )}
          {(order.status === 'READY' || order.status === 'SHIPPING') && (
            <Button
              type="primary"
              style={{ background: '#1e7a46', borderColor: '#1e7a46' }}
              onClick={() => onStatusChange(order.id, 'COMPLETED')}
            >
              Hoàn thành đơn hàng
            </Button>
          )}
          {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
            <Button danger onClick={() => onStatusChange(order.id, 'CANCELLED')}>
              Từ chối / Hủy đơn
            </Button>
          )}
        </Space>
      </div>
    </Drawer>
  );
};
