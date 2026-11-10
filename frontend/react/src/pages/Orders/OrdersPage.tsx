import { message } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Table, Tabs, Input, Select, Button, Tag, Space, Typography, Badge, Alert, Radio } from "antd";
import { TableColumnsType } from "antd";

import { AdminOrder, AdminOrderStatus } from "../../types/order";
import { useOrders } from "../../context/OrderContext";
import { OrderStatusBadge } from "../../components/ui/OrderStatusBadge";
import { useAuth } from "../../context/AuthContext";
import {
  OrderProgress,
  orderStatusKeys as statusLabels,
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
  const { t } = useTranslation();
  const { locale } = useLocaleTools();

  const {
    orders,
    updateStatus,
    reviewRefund,
    storageError,
    actionError,
    loading,
    refreshOrders,
  } = useOrders();
  usePageLoading(loading);
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [refundSubFilter, setRefundSubFilter] = useState<string>("ALL");
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

  const handleStatusChange = async (
    orderId: string,
    newStatus: AdminOrderStatus,
    reason?: string,
  ) => {
    const ok = await updateStatus(orderId, newStatus, reason);
    if (!ok) {
      message.warning(
        actionError ||
          t("business:orderspage.cannotChangeStatusYetCheckTheProgressAndConfirmPaymentCollectionBefore"),
      );
      return false;
    }
    message.success(t("business:orderspage.orderUpdated", { value1: t(statusLabels[newStatus]) }));
    return true;
  };

  const handleConfirmRefund = async (
    orderId: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => {
    return await reviewRefund(orderId, action, note);
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

    if (activeTab === "REFUND") {
      if (refundSubFilter === "ALL") {
        return o.hasRefundRequest === true || Boolean(o.refundStatus);
      }
      return o.refundStatus === refundSubFilter;
    }
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
      title: t("business:dashboard.orderCode"),
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
      title: t("business:dashboard.customer"),
      dataIndex: "customerName",
      key: "customerName",
      render: (name, record) => (
        <div>
          <Typography.Text strong>{name}</Typography.Text>
          <div style={{ fontSize: 12, color: "#6b6259" }}>
            {record.customerPhone} ·{" "}
            {record.items.reduce((s, i) => s + i.quantity, 0)} {t("business:orderspage.items")} </div>
        </div>
      ),
    },
    {
      title: t("business:party.store"),
      dataIndex: "storeName",
      key: "storeName",
      render: (store) => <Typography.Text>{store}</Typography.Text>,
    },
    {
      title: t("business:orderdetaildrawer.fulfilmentMethod"),
      dataIndex: "orderType",
      key: "orderType",
      render: (type) => (
        <Tag
          className={styles.typeTag}
          color={type === "DELIVERY" ? "blue" : "purple"}
        >
          {type === "DELIVERY" ? (
            <>
              <Truck size={13} /> {t("business:orderspage.delivery")} </>
          ) : (
            <>
              <Store size={13} /> {t("business:orderdetaildrawer.counterPickup")} </>
          )}
        </Tag>
      ),
    },
    {
      title: t("business:catalog.status"),
      dataIndex: "status",
      key: "status",
      render: (status: AdminOrderStatus, record) => (
        <Space direction="vertical" size={2}>
          <OrderStatusBadge status={status} />
          {record.refundStatus === "REFUNDED" ? (
            <Tag color="success">
              {t("business:orderspage.refundedBadge", {
                value1: new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(record.refundAmount ?? record.total),
              })}
            </Tag>
          ) : record.refundStatus === "PROCESSING" ? (
            <Tag color="processing">{t("business:orderspage.transferringTag")}</Tag>
          ) : record.refundStatus === "WAITING_BANK_DETAILS" ? (
            <Tag color="warning">{t("business:orderspage.waitingBankTag")}</Tag>
          ) : record.refundStatus === "APPROVED" ? (
            <Tag color="cyan">{t("business:orderspage.approvedReservedTag")}</Tag>
          ) : record.hasRefundRequest ? (
            <Badge status="error" text={t("business:orderspage.refundRequest")} />
          ) : null}
        </Space>
      ),
    },
    {
      title: t("business:cart.checkout"),
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method, record) => (
        <div>
          <span style={{ fontSize: 13 }}>
            {method === "BANK_TRANSFER" ? "VietQR" : t("business:orderdetaildrawer.cashCod")}
          </span>
          <div>
            <Tag
              color={["PAID", "COLLECTED"].includes(record.paymentStatus) ? "green" : "gold"}
              style={{ fontSize: 11 }}
            >
              {t(`admin:paymentStates.${record.paymentStatus}`)}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: t("business:id.total"),
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (total) => (
        <Typography.Text strong className={styles.moneyText}>
          {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(total)}{t("business:orderdetaildrawer.currency")} </Typography.Text>
      ),
    },
    {
      title: t("business:catalog.actions"),
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          icon={<Eye />}
          onClick={() => handleOpenDetail(record)}
          aria-label={t("business:orderspage.viewOrderDetails")}
        > {t("business:orderdetaildrawer.details")} </Button>
      ),
    },
  ];

  const tabItems = [
    { key: "ALL", label: t("business:orderspage.allOrders", { value1: orders.length }) },
    {
      key: "PROCESSING",
      label: t("business:orderspage.inProgress", { value1: orders.filter((o) =>
          ["CONFIRMED", "PREPARING", "READY"].includes(o.status),
        ).length }),
    },
    {
      key: "SHIPPING",
      label: t("business:orderspage.delivering", { value1: orders.filter((o) => o.status === "SHIPPING").length }),
    },
    {
      key: "COMPLETED",
      label: t("business:orderspage.completed", { value1: orders.filter((o) => o.status === "COMPLETED").length }),
    },
    {
      key: "CANCELLED",
      label: t("business:orderspage.cancelled", { value1: orders.filter((o) => o.status === "CANCELLED").length }),
    },
    {
      key: "REFUND",
      label: (
        <span> {t("business:orderspage.refund")}{" "}
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

  if (storageError) return <div role="alert"><p>{storageError}</p><Button onClick={refreshOrders}>{t('common:retry')}</Button></div>;
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
          <span className={styles.eyebrow}>{t("business:orderspage.cluckyOperations")}</span>
          <h1>{t("business:orderspage.ordersAtYourFingertips")}</h1>
          <p>{t("business:orderspage.trackPreparationPaymentsAndRefundRequestsInOnePlace")}</p>
        </div>
      </div>
      <div className={styles.metricsGrid}>
        {[
          {
            label: t("business:orderspage.allOrdersLabel"),
            value: orders.length,
            icon: ShoppingBag,
            tab: "ALL",
          },
          {
            label: t("business:orderprogress.preparing"),
            value: orders.filter((o) => o.status === "PREPARING").length,
            icon: ChefHat,
            tab: "PROCESSING",
          },
          {
            label: t("business:orders.completed"),
            value: orders.filter((o) => o.status === "COMPLETED").length,
            icon: CircleCheck,
            tab: "COMPLETED",
          },
          {
            label: t("business:orderspage.refundAwaitingReview"),
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
            aria-label={t("business:orders.searchOrders")}
            placeholder={t("business:orderspage.searchByOrderCodeCustomerPhone")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
          />

          {isAdmin && (
            <Select
              aria-label={t("business:orderspage.filterStores")}
              value={selectedStore}
              onChange={setSelectedStore}
              style={{ width: 220 }}
              options={[
                { value: "ALL", label: t("business:stores.allStores") },
                ...Array.from(new Map(orders.map(order => [order.storeId, order.storeName]))).map(([value, label]) => ({ value, label })),
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
              t("business:orderspage.filtersClearedOrderChangesHaveBeenPreserved"),
            );
          }}
        > {t("business:orderspage.clearFilters")} </Button>
      </div>

      {actionError && (
        <Alert
          message={actionError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === "REFUND" && (
        <div style={{ marginBottom: 16, overflowX: "auto" }}>
          <Radio.Group
            value={refundSubFilter}
            onChange={(e) => setRefundSubFilter(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="ALL">
              {t("business:orderspage.filterAllRefunds", {
                value1: orders.filter((o) => o.hasRefundRequest || o.refundStatus).length,
              })}
            </Radio.Button>
            <Radio.Button value="PENDING">
              {t("business:orderspage.filterPending", {
                value1: orders.filter((o) => o.refundStatus === "PENDING").length,
              })}
            </Radio.Button>
            <Radio.Button value="PROCESSING">
              {t("business:orderspage.filterProcessing", {
                value1: orders.filter((o) => o.refundStatus === "PROCESSING").length,
              })}
            </Radio.Button>
            <Radio.Button value="WAITING_BANK_DETAILS">
              {t("business:orderspage.filterWaitingBank", {
                value1: orders.filter((o) => o.refundStatus === "WAITING_BANK_DETAILS").length,
              })}
            </Radio.Button>
            <Radio.Button value="REFUNDED">
              {t("business:orderspage.filterRefunded", {
                value1: orders.filter((o) => o.refundStatus === "REFUNDED").length,
              })}
            </Radio.Button>
            <Radio.Button value="REJECTED">
              {t("business:orderspage.filterRejected", {
                value1: orders.filter((o) => o.refundStatus === "REJECTED").length,
              })}
            </Radio.Button>
          </Radio.Group>
        </div>
      )}

      <div className={styles.mobileCards}>
        {filteredOrders.length === 0 ? (
          <p className={styles.emptyState}>{t("business:orderspage.noOrdersMatchTheFilters")}</p>
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
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("business:cart.servings")} </p>
              <OrderProgress order={order} />
              <div className={styles.mobileCardTop}>
                <strong className={styles.moneyText}>
                  {new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(order.total)}{t("business:orderdetaildrawer.currency")} </strong>
                <Button onClick={() => handleOpenDetail(order)}> {t("business:orderspage.viewDetails")} </Button>
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
            showTotal: (total) => t("business:orderspage.ordersInTotal", { value1: total }),
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
