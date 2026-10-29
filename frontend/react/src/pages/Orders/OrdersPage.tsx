import { mockStores } from "../../mocks/catalogData";
import React, { useState } from "react";
import {
  Table,
  Tabs,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Typography,
  Badge,
  App as AntApp,
} from "antd";
import type { TableColumnsType } from "antd";

import { AdminOrder, AdminOrderStatus } from "../../types/order";
import { useOrders } from "../../context/OrderContext";
import { OrderStatusBadge } from "../../components/ui/OrderStatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  OrderProgress,
  orderStatusLabels as statusLabels,
} from "../../components/ui/OrderProgress";
import {
  ShoppingBag,
  ChefHat,
  CircleCheck,
  Undo2,
  Search,
  Eye,
  SlidersHorizontal,
  Truck,
  Store,
  CircleAlert,
} from "lucide-react";
import { OrderDetailDrawer } from "./components/OrderDetailDrawer";
import { RefundModal } from "./components/RefundModal";
import styles from "./orders.module.css";
import { usePageLoading } from "../../components/ui-loader/page-loading";

export const OrdersPage: React.FC = () => {
  const { message } = AntApp.useApp();
  const {
    orders,
    updateStatus,
    reviewRefund,
    storageError,
    actionError,
    loading,
  } = useOrders();
  usePageLoading(loading);
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");

  // Drawer & Modal states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<AdminOrder | null>(null);

  const handleOpenDetail = (order: AdminOrder) => {
    setSelectedOrderId(order.id);
    setDrawerOpen(true);
  };

  const handleStatusChange = (
    orderId: string,
    newStatus: AdminOrderStatus,
    reason?: string,
  ) => {
    if (!updateStatus(orderId, newStatus, reason)) {
      message.warning(
        "Chưa thể chuyển trạng thái. Kiểm tra tiến trình và xác nhận thu tiền trước khi hoàn thành.",
      );
      return false;
    }
    message.success(`Đã cập nhật đơn: ${statusLabels[newStatus]}`);
    return true;
  };

  const handleConfirmRefund = (
    orderId: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => {
    return reviewRefund(orderId, action, note);
  };

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    if (selectedStore !== "ALL" && o.storeId !== selectedStore) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = o.orderCode.toLowerCase().includes(q);
      const matchCustomer = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerPhone.includes(q);
      if (!matchCode && !matchCustomer && !matchPhone) return false;
    }

    if (activeTab === "REFUND") return o.hasRefundRequest === true;
    if (activeTab === "PROCESSING") {
      return (
        o.status === "CONFIRMED" ||
        o.status === "PREPARING" ||
        o.status === "READY"
      );
    }
    if (activeTab === "SHIPPING") return o.status === "SHIPPING";
    if (activeTab === "COMPLETED") return o.status === "COMPLETED";
    if (activeTab === "CANCELLED") return o.status === "CANCELLED";

    return true;
  });

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      render: (code, record) => (
        <Space orientation="vertical" size={2}>
          <Typography.Text strong style={{ color: "#16100d" }}>
            {code}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.time}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      render: (name, record) => (
        <div>
          <Typography.Text strong>{name}</Typography.Text>
          <div style={{ fontSize: 12, color: "#6b6259" }}>
            {record.customerPhone} ·{" "}
            {record.items.reduce((s, i) => s + i.quantity, 0)} món
          </div>
        </div>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "storeName",
      key: "storeName",
      render: (store) => <Typography.Text>{store}</Typography.Text>,
    },
    {
      title: "Hình thức",
      dataIndex: "orderType",
      key: "orderType",
      render: (type) => (
        <Tag
          className={styles.typeTag}
          color={type === "DELIVERY" ? "blue" : "purple"}
        >
          {type === "DELIVERY" ? (
            <>
              <Truck size={13} /> Giao hàng
            </>
          ) : (
            <>
              <Store size={13} /> Nhận tại quầy
            </>
          )}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: AdminOrderStatus, record) => (
        <Space orientation="vertical" size={2}>
          <OrderStatusBadge status={status} />
          {record.hasRefundRequest && (
            <Badge status="error" text="Yêu cầu hoàn tiền" />
          )}
        </Space>
      ),
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method, record) => (
        <div>
          <span style={{ fontSize: 13 }}>
            {method === "BANK_TRANSFER" ? "VietQR" : "Tiền mặt (COD)"}
          </span>
          <div>
            <Tag
              color={record.paymentStatus === "PAID" ? "green" : "gold"}
              style={{ fontSize: 11 }}
            >
              {record.paymentStatus === "PAID" ? "Đã thu" : "Chưa thu"}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (total) => (
        <Typography.Text strong className={styles.moneyText}>
          {new Intl.NumberFormat("vi-VN").format(total)}đ
        </Typography.Text>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          icon={<Eye />}
          onClick={() => handleOpenDetail(record)}
          aria-label="Xem chi tiết đơn"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: "ALL", label: `Tất cả đơn (${orders.length})` },
    {
      key: "PROCESSING",
      label: `Đang xử lý (${
        orders.filter((o) =>
          ["CONFIRMED", "PREPARING", "READY"].includes(o.status),
        ).length
      })`,
    },
    {
      key: "SHIPPING",
      label: `Đang giao (${orders.filter((o) => o.status === "SHIPPING").length})`,
    },
    {
      key: "COMPLETED",
      label: `Đã hoàn thành (${orders.filter((o) => o.status === "COMPLETED").length})`,
    },
    {
      key: "CANCELLED",
      label: `Đã hủy (${orders.filter((o) => o.status === "CANCELLED").length})`,
    },
    {
      key: "REFUND",
      label: (
        <span>
          Hoàn tiền{" "}
          {orders.filter((o) => o.hasRefundRequest).length > 0 && (
            <Badge
              count={orders.filter((o) => o.hasRefundRequest).length}
              size="small"
            />
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={`${styles.ordersContainer} m3-admin-page`}>
      {(storageError || actionError) && (
        <p role="alert" className={styles.drawerError}>
          <CircleAlert size={16} />
          {actionError || storageError}
        </p>
      )}
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>VẬN HÀNH CLUCKY</span>
          <h1>Đơn hàng, trong tầm tay.</h1>
          <p>Theo dõi bếp, thanh toán và yêu cầu hoàn tiền tại một nơi.</p>
        </div>
      </div>
      <div className={styles.metricsGrid}>
        {[
          {
            label: "Tất cả đơn",
            value: orders.length,
            icon: ShoppingBag,
            tab: "ALL",
          },
          {
            label: "Đang chế biến",
            value: orders.filter((o) => o.status === "PREPARING").length,
            icon: ChefHat,
            tab: "PROCESSING",
          },
          {
            label: "Đã hoàn thành",
            value: orders.filter((o) => o.status === "COMPLETED").length,
            icon: CircleCheck,
            tab: "COMPLETED",
          },
          {
            label: "Chờ duyệt hoàn",
            value: orders.filter((o) => o.hasRefundRequest).length,
            icon: Undo2,
            tab: "REFUND",
          },
        ].map((metric) => (
          <button
            key={metric.label}
            onClick={() => setActiveTab(metric.tab)}
            type="button"
            className={styles.metricCard}
            aria-pressed={activeTab === metric.tab}
          >
            <metric.icon size={20} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
      <div className={styles.filterBar}>
        <div className={styles.leftControls}>
          <Input
            prefix={<Search style={{ color: "#6b6259" }} />}
            aria-label="Tìm kiếm đơn hàng"
            placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
          />

          {isAdmin && (
            <Select
              aria-label="Lọc chi nhánh"
              value={selectedStore}
              onChange={setSelectedStore}
              style={{ width: 220 }}
              options={[
                { value: "ALL", label: "Tất cả chi nhánh" },
                ...mockStores.map((store) => ({
                  value: String(store.id),
                  label: store.name,
                })),
              ]}
            />
          )}
        </div>

        <Button
          icon={<SlidersHorizontal />}
          onClick={() => {
            setSearchQuery("");
            setSelectedStore("ALL");
            setActiveTab("ALL");
            message.info(
              "Đã xóa bộ lọc. Các thay đổi đơn hàng được giữ nguyên.",
            );
          }}
        >
          Xóa bộ lọc
        </Button>
      </div>

      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      <div className={styles.mobileCards}>
        {filteredOrders.length === 0 ? (
          <p className={styles.emptyState}>Không có đơn phù hợp bộ lọc.</p>
        ) : (
          filteredOrders.map((order) => (
            <article className={styles.mobileCard} key={order.id}>
              <div className={styles.mobileCardTop}>
                <strong>{order.orderCode}</strong>
                <OrderStatusBadge status={order.status} />
              </div>
              <h3>{order.customerName}</h3>
              <p>
                {order.storeName} ·{" "}
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} phần
                ăn
              </p>
              <OrderProgress order={order} />
              <div className={styles.mobileCardTop}>
                <strong className={styles.moneyText}>
                  {new Intl.NumberFormat("vi-VN").format(order.total)}đ
                </strong>
                <Button onClick={() => handleOpenDetail(order)}>
                  Xem chi tiết
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
      <div className={styles.desktopTable}>
        <Table
          loading={false}
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          pagination={{
            pageSize: 8,
            showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
          }}
          scroll={{ x: 1000 }}
        />
      </div>

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
