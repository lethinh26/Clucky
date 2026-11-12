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
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { OrderDetailDrawer } from "./components/OrderDetailDrawer";
import { RefundModal } from "./components/RefundModal";
import { FinanceModal } from "../Payments/FinanceDrawer";
import { ReceiptBillModal } from "../Staff/components/ReceiptBillModal";
import type { StaffOrder } from "../../mocks/mockStaffOrders";
import {
  exportAdminOrdersByDateExcel,
  formatDateLabelVn,
  formatQueueWithDate,
  getOrderVnDateYmd,
  getTodayVn,
  shiftDateYmd,
} from "../../utils/orderExcelExport";
import styles from "./orders.module.css";
import "./admin-orders.css";
import { usePageLoading } from "../../components/ui-loader/page-loading";

export const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const { locale, money } = useLocaleTools();
  const todayVn = getTodayVn();

  const {
    orders,
    stores,
    currentStore,
    storeOpenState,
    updateStatus,
    confirmCOD,
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
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [queueFilter, setQueueFilter] = useState<string>("");

  // Drawer & Modal states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [orderForRefund, setOrderForRefund] = useState<AdminOrder | null>(null);
  const [financeOrderId, setFinanceOrderId] = useState<number | null>(null);
  const [kotModalOrder, setKotModalOrder] = useState<StaffOrder | null>(null);

  const handleOpenDetail = (order: AdminOrder) => {
    setSelectedOrderId(order.id);
    setDrawerOpen(true);
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: AdminOrderStatus,
    reason?: string,
  ) => {
    let ok = false;
    if (reason === "COLLECT_COD") {
      ok = await confirmCOD(orderId);
      if (ok) {
        try {
          await updateStatus(orderId, "COMPLETED", "COLLECT_COD");
        } catch {
          // Ignore if already completed
        }
        message.success(t("business:staffactions.codCompletedSuccess"));
        return true;
      }
    } else {
      ok = await updateStatus(orderId, newStatus, reason);
      if (ok) {
        if (newStatus === "PREPARING") {
          const target = orders.find((o) => o.id === orderId);
          if (target) {
            const qNum = target.queueNumber && target.queueNumber > 0 ? target.queueNumber : 1;
            const qFormatted = `#${String(qNum).padStart(3, "0")}`;
            setDrawerOpen(false);
            setKotModalOrder({
              id: target.id,
              orderCode: target.orderCode,
              queueNumber: qNum,
              orderSource: "WEB",
              diningOption: target.orderType === "PICKUP" ? "DINE_IN" : "TAKE_AWAY",
              customerName: target.customerName,
              customerPhone: target.customerPhone,
              storeId: target.storeId,
              storeName: stores.find((s) => Number(s.id) === Number(target.storeId))?.name || target.storeName,
              orderType: target.orderType,
              deliveryAddress: target.deliveryAddress,
              status: "PREPARING",
              paymentMethod: target.paymentMethod,
              paymentStatus: target.paymentStatus === "PAID" || target.paymentStatus === "COLLECTED" ? target.paymentStatus : "PENDING",
              items: target.items,
              subtotal: target.subtotal,
              discount: target.discount,
              shippingFee: target.shippingFee,
              total: target.total,
              note: target.note,
              time: target.time,
              createdAt: target.createdAt,
              updatedAt: target.updatedAt,
            });
            message.success({
              content: t("business:staffactions.kotOpened", { queue: qFormatted, code: target.orderCode }),
              key: `kot-mgr-${orderId}-${Date.now()}`,
            });
            return true;
          }
        }
        message.success(t("business:orderspage.orderUpdated", { value1: t(statusLabels[newStatus]) }));
        return true;
      }
    }
    message.warning(
      actionError ||
        t("business:orderspage.cannotChangeStatusYetCheckTheProgressAndConfirmPaymentCollectionBefore"),
    );
    return false;
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
    if (selectedDate && getOrderVnDateYmd(o.createdAt) !== selectedDate) return false;

    if (queueFilter.trim()) {
      const digits = queueFilter.trim().replace(/^#?0*/, "");
      if (digits && /^\d+$/.test(digits)) {
        if (String(o.queueNumber ?? "") !== digits) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = o.orderCode.toLowerCase().includes(q);
      const matchCustomer = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerPhone.includes(q);
      const matchQueue = o.queueNumber != null && `#${String(o.queueNumber).padStart(3, "0")}`.toLowerCase().includes(q);
      if (!matchCode && !matchCustomer && !matchPhone && !matchQueue) return false;
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

  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    for (const order of filteredOrders) {
      const dateKey = getOrderVnDateYmd(order.createdAt);
      const list = map.get(dateKey) ?? [];
      list.push(order);
      map.set(dateKey, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredOrders]);

  const handleExportExcel = (targetOrders: AdminOrder[], dateFilterLabel?: string) => {
    if (targetOrders.length === 0) {
      message.warning(t("business:dateFilter.noOrdersToExport"));
      return;
    }
    exportAdminOrdersByDateExcel(targetOrders, stores, dateFilterLabel);
    message.success(t("business:dateFilter.exportSuccess", { count: targetOrders.length }));
  };

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: t("admin:ui.queueNumberCol"),
      dataIndex: "queueNumber",
      key: "queueNumber",
      width: 140,
      render: (qNum: number | undefined, record) => {
        const { queueLabel, dateLabel } = formatQueueWithDate(qNum, record.createdAt);
        return (
          <Space orientation="vertical" size={2}>
            <Tag color="volcano" style={{ fontWeight: 800, fontSize: 13 }}>{queueLabel}</Tag>
            {dateLabel && <Typography.Text type="secondary" style={{ fontSize: 11 }}>{dateLabel}</Typography.Text>}
          </Space>
        );
      },
    },
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
        <Space direction="vertical" size={2}>
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleOpenDetail(record)}
            aria-label={t("business:orderspage.viewOrderDetails")}
          >
            {t("business:orderdetaildrawer.details")}
          </Button>
          <Button
            type="text"
            size="small"
            icon={<Wallet size={14} />}
            onClick={() => setFinanceOrderId(Number(record.id))}
          >
            {t("admin:ui.finance")}
          </Button>
        </Space>
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
      {currentStore && !storeOpenState.isOpen && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={storeOpenState.bannerTitle}
          description={storeOpenState.bannerDescription}
        />
      )}
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>{t("business:orderspage.cluckyOperations")}</span>
          <h1>{t("business:orderspage.ordersAtYourFingertips")}</h1>
          <p>{t("business:orderspage.trackPreparationPaymentsAndRefundRequestsInOnePlace")}</p>
        </div>
      </div>

      <section className="admin-orders-date-card" style={{ marginBottom: 16 }} aria-label={t("business:dateFilter.ariaLabel")}>
        <div className="admin-orders-date-left">
          <div className="admin-orders-date-icon">
            <Calendar size={18} />
          </div>
          <div className="admin-orders-date-meta">
            <span className="admin-orders-date-eyebrow">{t("business:dateFilter.managerEyebrow")}</span>
            <strong className="admin-orders-date-title">
              {selectedDate
                ? `${selectedDate === todayVn ? t("business:dateFilter.todayPrefix") : ""}${formatDateLabelVn(selectedDate, locale)}`
                : t("business:dateFilter.allDatesCount", { count: groupedByDate.length })}
            </strong>
          </div>
        </div>
        <div className="admin-orders-date-controls">
          <div className="admin-orders-date-stepper">
            <button
              type="button"
              className="admin-orders-date-step-btn"
              title={t("business:dateFilter.prevDay")}
              onClick={() => setSelectedDate(prev => shiftDateYmd(prev || todayVn, -1))}
            >
              <ChevronLeft size={15} />
            </button>
            <input
              type="date"
              aria-label={t("business:dateFilter.pickDateAria")}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="admin-orders-date-input"
            />
            <button
              type="button"
              className="admin-orders-date-step-btn"
              title={t("business:dateFilter.nextDay")}
              onClick={() => setSelectedDate(prev => shiftDateYmd(prev || todayVn, 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <Button
            type={selectedDate === todayVn ? "primary" : "default"}
            onClick={() => setSelectedDate(todayVn)}
          >
            {t("business:dateFilter.today")}
          </Button>
          {selectedDate && (
            <Button onClick={() => setSelectedDate("")}>
              {t("business:dateFilter.allDatesBtn")}
            </Button>
          )}
          <Button
            type="primary"
            className="admin-orders-excel-btn"
            icon={<Download size={14} />}
            disabled={filteredOrders.length === 0}
            onClick={() => handleExportExcel(filteredOrders, selectedDate || undefined)}
          >
            {t("business:dateFilter.exportExcel")}
          </Button>
        </div>
      </section>
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

          <Input
            aria-label={t("admin:ui.searchQueueNumber")}
            placeholder={t("admin:ui.searchQueueNumber")}
            value={queueFilter}
            onChange={(e) => setQueueFilter(e.target.value)}
            style={{ width: 200 }}
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
            setQueueFilter("");
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
                <div>
                  <strong>{order.orderCode}</strong>
                  {order.queueNumber ? (
                    <Tag color="volcano" style={{ marginLeft: 8, fontWeight: 700 }}>
                      {formatQueueWithDate(order.queueNumber, order.createdAt).combinedLabel}
                    </Tag>
                  ) : null}
                </div>
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
        {groupedByDate.length === 0 ? (
          <p className={styles.emptyState}>{t("business:orderspage.noOrdersMatchTheFilters")}</p>
        ) : (
          <div className="admin-orders-date-groups" style={{ padding: 0 }}>
            {groupedByDate.map(([dateKey, dayOrders]) => {
              const dayCompleted = dayOrders.filter((o) => o.status === "COMPLETED").length;
              const dayRevenue = dayOrders
                .filter((o) => o.status !== "CANCELLED" && ["PAID", "COLLECTED"].includes(o.paymentStatus))
                .reduce((sum, o) => sum + o.total, 0);
              return (
                <section key={dateKey} className="admin-orders-date-group">
                  <div className="admin-orders-date-group-header">
                    <div className="admin-orders-date-group-title">
                      <Calendar size={15} />
                      <strong>
                        {dateKey === todayVn ? t("business:dateFilter.todayPrefix") : ""}
                        {formatDateLabelVn(dateKey, locale)}
                      </strong>
                      <Tag color="red">{t("business:dateFilter.ordersFullUnit", { count: dayOrders.length })}</Tag>
                      <Tag color="green">{t("business:dateFilter.completedCountTag", { count: dayCompleted })}</Tag>
                    </div>
                    <div className="admin-orders-date-group-actions">
                      <span className="admin-orders-date-group-revenue">
                        {t("business:dateFilter.dailyNetRevenue")} <strong>{money(dayRevenue)}</strong>
                      </span>
                      <Button
                        size="small"
                        icon={<Download size={13} />}
                        onClick={() => handleExportExcel(dayOrders, dateKey)}
                      >
                        {t("business:dateFilter.exportExcelDay", { date: dateKey.split("-").reverse().join("/") })}
                      </Button>
                    </div>
                  </div>
                  <Table
                    loading={false}
                    columns={columns}
                    dataSource={dayOrders}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1000 }}
                  />
                </section>
              );
            })}
          </div>
        )}
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

      {financeOrderId !== null && (
        <FinanceModal
          key={`order-finance:${financeOrderId}`}
          orderId={financeOrderId}
          stores={stores}
          onClose={() => {
            setFinanceOrderId(null);
            void refreshOrders();
          }}
          onChanged={() => void refreshOrders()}
        />
      )}

      <ReceiptBillModal
        key={kotModalOrder ? `${kotModalOrder.id}-KOT` : "closed"}
        open={Boolean(kotModalOrder)}
        order={kotModalOrder}
        onClose={() => setKotModalOrder(null)}
        initialMode="KOT"
      />
    </div>
  );
};
