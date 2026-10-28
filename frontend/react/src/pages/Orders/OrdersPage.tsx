import React, { useState } from 'react';
import { Table, Tabs, Input, Select, Button, Tag, Space, Typography, Badge, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined, CarOutlined, ShopOutlined } from '@ant-design/icons';
import { AdminOrder, AdminOrderStatus } from '../../types/order';
import { MOCK_ADMIN_ORDERS } from '../../mocks/adminOrderData';
import { OrderDetailDrawer } from './components/OrderDetailDrawer';
import { RefundModal } from './components/RefundModal';
import styles from './orders.module.css';

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

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>(MOCK_ADMIN_ORDERS);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');

  // Drawer & Modal states
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<AdminOrder | null>(null);

  const handleOpenDetail = (order: AdminOrder) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: AdminOrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    message.success(`Đã cập nhật trạng thái đơn sang "${statusLabels[newStatus]}"!`);
  };

  const handleConfirmRefund = (orderId: string, action: 'APPROVED' | 'REJECTED') => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              hasRefundRequest: false,
              note: `${o.note || ''} [Đã ${action === 'APPROVED' ? 'duyệt' : 'từ chối'} hoàn tiền]`,
            }
          : o
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              hasRefundRequest: false,
              note: `${prev.note || ''} [Đã ${action === 'APPROVED' ? 'duyệt' : 'từ chối'} hoàn tiền]`,
            }
          : null
      );
    }
  };

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    if (selectedStore !== 'ALL' && o.storeId !== selectedStore) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = o.orderCode.toLowerCase().includes(q);
      const matchCustomer = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerPhone.includes(q);
      if (!matchCode && !matchCustomer && !matchPhone) return false;
    }

    if (activeTab === 'REFUND') return o.hasRefundRequest === true;
    if (activeTab === 'PROCESSING') {
      return o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'READY';
    }
    if (activeTab === 'SHIPPING') return o.status === 'SHIPPING';
    if (activeTab === 'COMPLETED') return o.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return o.status === 'CANCELLED';

    return true;
  });

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (code, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong style={{ color: '#16100d' }}>
            {code}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.time}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, record) => (
        <div>
          <Typography.Text strong>{name}</Typography.Text>
          <div style={{ fontSize: 12, color: '#6b6259' }}>
            {record.customerPhone} · {record.items.reduce((s, i) => s + i.quantity, 0)} món
          </div>
        </div>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (store) => <Typography.Text>{store}</Typography.Text>,
    },
    {
      title: 'Hình thức',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (type) => (
        <Tag color={type === 'DELIVERY' ? 'blue' : 'purple'}>
          {type === 'DELIVERY' ? <><CarOutlined /> Giao hàng</> : <><ShopOutlined /> Nhận tại quầy</>}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={statusColors[status] ?? 'default'} className={styles.statusTag}>
            {statusLabels[status] ?? status}
          </Tag>
          {record.hasRefundRequest && <Badge status="error" text="Yêu cầu hoàn tiền" />}
        </Space>
      ),
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method, record) => (
        <div>
          <span style={{ fontSize: 13 }}>
            {method === 'BANK_TRANSFER' ? 'VietQR' : 'Tiền mặt (COD)'}
          </span>
          <div>
            <Tag color={['PAID', 'COLLECTED'].includes(record.paymentStatus) ? 'green' : 'gold'} style={{ fontSize: 11 }}>
              {['PAID', 'COLLECTED'].includes(record.paymentStatus) ? 'Đã thu' : 'Chưa thu'}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (total) => (
        <Typography.Text strong className={styles.moneyText}>
          {new Intl.NumberFormat('vi-VN').format(total)}đ
        </Typography.Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
          aria-label="Xem chi tiết đơn"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `Tất cả đơn (${orders.length})` },
    {
      key: 'PROCESSING',
      label: `Đang xử lý (${
        orders.filter((o) => ['CONFIRMED', 'PREPARING', 'READY'].includes(o.status)).length
      })`,
    },
    {
      key: 'SHIPPING',
      label: `Đang giao (${orders.filter((o) => o.status === 'SHIPPING').length})`,
    },
    {
      key: 'COMPLETED',
      label: `Đã hoàn thành (${orders.filter((o) => o.status === 'COMPLETED').length})`,
    },
    {
      key: 'CANCELLED',
      label: `Đã hủy (${orders.filter((o) => o.status === 'CANCELLED').length})`,
    },
    {
      key: 'REFUND',
      label: (
        <span>
          Hoàn tiền{' '}
          {orders.filter((o) => o.hasRefundRequest).length > 0 && (
            <Badge count={orders.filter((o) => o.hasRefundRequest).length} size="small" />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.ordersContainer}>
      <div className={styles.filterBar}>
        <div className={styles.leftControls}>
          <Input
            prefix={<SearchOutlined style={{ color: '#6b6259' }} />}
            placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
          />

          <Select
            value={selectedStore}
            onChange={setSelectedStore}
            style={{ width: 220 }}
            options={[
              { value: 'ALL', label: 'Tất cả chi nhánh' },
              { value: '1', label: 'Nguyễn Trãi (Quận 5)' },
              { value: '2', label: 'Phan Văn Trị (Bình Thạnh)' },
              { value: '3', label: 'Lê Văn Việt (Thủ Đức)' },
            ]}
          />
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            setOrders(MOCK_ADMIN_ORDERS);
            message.info('Đã tải lại danh sách đơn hàng mới nhất.');
          }}
        >
          Làm mới
        </Button>
      </div>

      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      <Table
        columns={columns}
        dataSource={filteredOrders}
        rowKey="id"
        pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} đơn hàng` }}
        scroll={{ x: 800 }}
      />

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onOpenRefundModal={(ord) => {
          setOrderForRefund(ord);
          setRefundModalOpen(true);
        }}
      />

      {/* Refund Modal */}
      <RefundModal
        order={orderForRefund}
        open={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onConfirmRefund={handleConfirmRefund}
      />
    </div>
  );
};
