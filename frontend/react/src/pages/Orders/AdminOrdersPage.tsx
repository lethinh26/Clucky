import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Pagination, Select, Space, Spin, Table, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { message } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import { OrderStatusBadge } from "../../components/ui/OrderStatusBadge";
import { orderStatusKeys } from "../../components/ui/OrderProgress";
import { adminFinance, orderForAdmin, type OrderQuery } from "../../lib/admin-finance";
import { getErrorMessage, ordersApi, storesApi, type BackendOrder, type BackendRefund, type Store } from "../../lib/api";
import type { AdminOrder } from "../../types/order";
import {
  exportAdminOrdersByDateExcel,
  formatDateLabelVn,
  formatQueueWithDate,
  getOrderVnDateYmd,
  getTodayVn,
  shiftDateYmd,
} from "../../utils/orderExcelExport";
import { AdminOrderDrawer } from "./components/AdminOrderDrawer";
import { FinanceModal } from "../Payments/FinanceDrawer";
import { orderDate, paymentColor, paymentMethodLabel } from "./presentation";
import "./admin-orders.css";
import { useOrderAlerts } from "../../hooks/useOrderAlerts";
import { OrderSoundButton } from "../../components/ui/OrderSoundButton";

export function AdminOrdersPage() {
  const { t } = useTranslation();
  const { money, locale } = useLocaleTools();
  const [params] = useSearchParams();
  const customer = params.get("customerId");
  const linkedOrderCode = params.get("orderCode")?.trim() || undefined;
  const invalidOrderCode = linkedOrderCode !== undefined && (linkedOrderCode.length > 80 || linkedOrderCode.includes("\0"));
  const customerId = customer && /^[1-9]\d*$/.test(customer) && Number.isSafeInteger(Number(customer)) ? Number(customer) : undefined;
  const invalidCustomer = customer !== null && customerId === undefined;
  const todayVn = getTodayVn();
  const [query, setQuery] = useState<OrderQuery>({ page: 0, size: 50, orderCode: linkedOrderCode });
  const [revision, setRevision] = useState(0);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BackendOrder | null>(null);
  const [refund, setRefund] = useState<BackendRefund | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [financeId, setFinanceId] = useState<number | null>(null);
  const loadedScope = useRef("");
  const alerts = useOrderAlerts();
  const { observe } = alerts;
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => { setQuery(current => ({ ...current, page: 0, customerId })); setSelectedId(null); }, [customerId, customer]);
  useEffect(() => {
    const controller = new AbortController();
    void storesApi.list(false, controller.signal).then(data => { if (!controller.signal.aborted) setStores(data); })
      .catch(failure => { if (!controller.signal.aborted) setStoreError(getErrorMessage(failure)); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setError("");
    const scope = JSON.stringify({ ...query, customerId });
    if (loadedScope.current !== scope) { setOrders([]); setTotal(0); }
    loadedScope.current = scope;
    if (invalidCustomer || invalidOrderCode || query.customerId !== customerId) { setOrders([]); setTotal(0); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    void adminFinance.orders({ ...query, customerId }, controller.signal).then(page => {
      if (controller.signal.aborted) return;
      if (query.page > 0 && page.content.length === 0) { setQuery(current => ({ ...current, page: Math.max(0, page.totalPages - 1) })); return; }
      const next = page.content.map(order => orderForAdmin(order));
      observe(next, scope, query.page === 0);
      setOrders(next); setTotal(page.totalElements);
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, customerId, invalidCustomer, invalidOrderCode, revision, observe]);
  useEffect(() => {
    if (selectedId !== null || financeId !== null) return;
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh, selectedId, financeId]);
  useEffect(() => {
    setDetailError(""); setRefundError("");
    if (!selectedId) return;
    const controller = new AbortController();
    setDetailLoading(true);
    const detailRequest = ordersApi.getById(selectedId, controller.signal)
      .then(order => { if (!controller.signal.aborted) setSelected(order); })
      .catch(failure => { if (!controller.signal.aborted) setDetailError(getErrorMessage(failure)); });
    const refundRequest = adminFinance.refunds({ page: 0, size: 1, orderId: Number(selectedId) }, controller.signal)
      .then(refunds => { if (!controller.signal.aborted) setRefund(refunds.content[0] ?? null); })
      .catch(failure => { if (!controller.signal.aborted) setRefundError(getErrorMessage(failure)); });
    void Promise.all([detailRequest, refundRequest]).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, revision]);

  function openDetail(id: string) {
    setSelected(null); setRefund(null); setDetailError(""); setRefundError(""); setSelectedId(id);
  }

  const groupedByDate = useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    for (const order of orders) {
      const dateKey = getOrderVnDateYmd(order.createdAt);
      const list = map.get(dateKey) ?? [];
      list.push(order);
      map.set(dateKey, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [orders]);

  const summaryStats = useMemo(() => {
    const completedCount = orders.filter(o => o.status === "COMPLETED").length;
    const paidCount = orders.filter(o => ["PAID", "COLLECTED"].includes(o.paymentStatus)).length;
    const collectedRevenue = orders
      .filter(o => o.status !== "CANCELLED" && ["PAID", "COLLECTED"].includes(o.paymentStatus))
      .reduce((sum, o) => sum + o.total, 0);
    return { completedCount, paidCount, collectedRevenue };
  }, [orders]);

  const handleExportExcel = (targetOrders: AdminOrder[], dateFilterLabel?: string) => {
    if (targetOrders.length === 0) {
      message.warning(t("business:dateFilter.noOrdersToExport"));
      return;
    }
    exportAdminOrdersByDateExcel(targetOrders, stores, dateFilterLabel);
    message.success(t("business:dateFilter.exportSuccess", { count: targetOrders.length }));
  };

  const columns = [
    {
      title: t("admin:ui.queueNumberCol"),
      width: 155,
      render: (_: unknown, order: AdminOrder) => {
        const { queueLabel, dateLabel } = formatQueueWithDate(order.queueNumber, order.createdAt);
        return (
          <div className="order-cell">
            <Tag color="volcano" style={{ fontWeight: 800, fontSize: 13 }}>{queueLabel}</Tag>
            {dateLabel && <small>{dateLabel}</small>}
          </div>
        );
      },
    },
    { title: t("business:promotionUi.order"), width: 220, render: (_: unknown, order: AdminOrder) => <div className="order-cell"><Button type="link" onClick={() => openDetail(order.id)}>{order.orderCode}</Button><small>{orderDate(order.createdAt, locale)}</small></div> },
    { title: t("admin:nav.customers"), width: 175, render: (_: unknown, order: AdminOrder) => <div className="order-cell"><strong>{order.customerName}</strong><small>{order.customerPhone || t("admin:ui.noPhoneNumberProvided")}</small></div> },
    { title: t("admin:ui.branchFulfillment"), width: 220, render: (_: unknown, order: AdminOrder) => <div className="order-cell"><span>{stores.find(store => store.id === Number(order.storeId))?.name || order.storeName}</span><small>{order.orderType === 'PICKUP' ? t("business:orderdetaildrawer.counterPickup") : t("business:checkout.homeDelivery")}</small></div> },
    { title: t("accounts:status"), width: 155, render: (_: unknown, order: AdminOrder) => <OrderStatusBadge status={order.status} /> },
    { title: t("business:cart.checkout"), width: 185, render: (_: unknown, order: AdminOrder) => <div className="order-cell"><Tag color={paymentColor(order.paymentStatus)}>{t(`admin:paymentStates.${order.paymentStatus ?? 'UNKNOWN'}`, { defaultValue: t("admin:paymentStates.UNKNOWN") })}</Tag><small>{paymentMethodLabel(order.paymentMethod)}</small></div> },
    { title: t("business:id.total"), width: 130, align: 'right' as const, dataIndex: "total", render: (amount: number) => <strong className="order-amount">{money(amount)}</strong> },
    { title: t("accounts:action"), width: 125, fixed: 'right' as const, render: (_: unknown, order: AdminOrder) => <Space direction="vertical" size={0}><Button type="link" size="small" onClick={() => openDetail(order.id)}>{t("business:orderdetaildrawer.details")}</Button>
      <Button type="text" size="small" icon={<WalletOutlined />} onClick={() => setFinanceId(Number(order.id))}>{t("admin:ui.finance")}</Button></Space> },
  ];

  return <div className="admin-orders">
    <header className="admin-orders-heading"><div><span className="order-eyebrow">{t("admin:ui.systemAdministration")}</span>
      <Typography.Title level={2}>{t("admin:ui.orderManagement")}</Typography.Title>
      <Typography.Text type="secondary">{t("admin:ui.trackOrdersPaymentsAndRefundsAcrossBranches")}</Typography.Text></div>
      <Tag icon={<FileTextOutlined />}>{total.toLocaleString('vi-VN')} {t("admin:ui.orders309")}</Tag></header>
    {customerId && <Alert type="info" message={t("admin:ui.filteringOrdersForCustomer", { value1: customerId })} />}
    {invalidCustomer && <Alert type="error" message={t("admin:ui.theCustomeridInTheUrlIsInvalidThe")} />}
    {invalidOrderCode && <Alert type="error" message={t("admin:ui.theOrderIdInTheUrlIsInvalid")} />}

    <section className="admin-orders-date-card" aria-label={t("business:dateFilter.ariaLabel")}>
      <div className="admin-orders-date-left">
        <div className="admin-orders-date-icon">
          <CalendarOutlined />
        </div>
        <div className="admin-orders-date-meta">
          <span className="admin-orders-date-eyebrow">{t("business:dateFilter.adminEyebrow")}</span>
          <strong className="admin-orders-date-title">
            {query.date
              ? `${query.date === todayVn ? t("business:dateFilter.todayPrefix") : ""}${formatDateLabelVn(query.date, locale)}`
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
            onClick={() =>
              setQuery(current => ({
                ...current,
                page: 0,
                date: shiftDateYmd(current.date || todayVn, -1),
              }))
            }
          >
            <LeftOutlined />
          </button>
          <input
            type="date"
            aria-label={t("business:dateFilter.pickDateAria")}
            value={query.date || ""}
            onChange={e =>
              setQuery(current => ({
                ...current,
                page: 0,
                date: e.target.value || undefined,
              }))
            }
            className="admin-orders-date-input"
          />
          <button
            type="button"
            className="admin-orders-date-step-btn"
            title={t("business:dateFilter.nextDay")}
            onClick={() =>
              setQuery(current => ({
                ...current,
                page: 0,
                date: shiftDateYmd(current.date || todayVn, 1),
              }))
            }
          >
            <RightOutlined />
          </button>
        </div>

        <Button
          size="middle"
          type={query.date === todayVn ? "primary" : "default"}
          onClick={() => setQuery(current => ({ ...current, page: 0, date: todayVn }))}
        >
          {t("business:dateFilter.today")}
        </Button>

        {query.date && (
          <Button
            size="middle"
            onClick={() => setQuery(current => ({ ...current, page: 0, date: undefined }))}
          >
            {t("business:dateFilter.allDatesBtn")}
          </Button>
        )}

        <OrderSoundButton alerts={alerts} />
        <Button size="middle" icon={<ReloadOutlined />} onClick={refresh}>
          {t("business:dateFilter.refresh")}
        </Button>

        <Button
          size="middle"
          type="primary"
          className="admin-orders-excel-btn"
          icon={<DownloadOutlined />}
          disabled={orders.length === 0}
          onClick={() => handleExportExcel(orders, query.date)}
        >
          {t("business:dateFilter.exportExcel")}
        </Button>
      </div>

      <div className="admin-orders-date-kpis">
        <div className="admin-orders-kpi-pill">
          <span>{t("business:dateFilter.displayedOrders")}</span>
          <strong>{t("business:dateFilter.ordersUnit", { count: orders.length })}</strong>
        </div>
        <div className="admin-orders-kpi-pill">
          <span>{t("business:dateFilter.completedLabel")}</span>
          <strong>{t("business:dateFilter.ordersUnit", { count: summaryStats.completedCount })}</strong>
        </div>
        <div className="admin-orders-kpi-pill">
          <span>{t("business:dateFilter.paidLabel")}</span>
          <strong>{t("business:dateFilter.ordersUnit", { count: summaryStats.paidCount })}</strong>
        </div>
        <div className="admin-orders-kpi-pill admin-orders-kpi-highlight">
          <span>{t("business:dateFilter.netRevenueLabel")}</span>
          <strong>{money(summaryStats.collectedRevenue)}</strong>
        </div>
      </div>
    </section>

    <div className="admin-orders-list">
    <div className="admin-orders-filters">
      <Input.Search aria-label={t("admin:ui.searchOrderId")} placeholder={t("admin:ui.searchByOrderId")} prefix={<SearchOutlined />} defaultValue={linkedOrderCode} allowClear maxLength={80} onSearch={orderCode => setQuery(current => ({ ...current, page: 0, orderCode: orderCode.trim() || undefined }))} />
      <Input.Search
        aria-label={t("admin:ui.searchQueueNumber")}
        placeholder={t("admin:ui.searchQueueNumber")}
        allowClear
        maxLength={10}
        onSearch={val => {
          const digits = val.trim().replace(/^#?0*/, "");
          const parsed = digits && /^\d+$/.test(digits) && Number(digits) > 0 ? Number(digits) : undefined;
          setQuery(current => ({ ...current, page: 0, queueNumber: parsed }));
        }}
        onChange={e => {
          if (!e.target.value) {
            setQuery(current => (current.queueNumber === undefined ? current : { ...current, page: 0, queueNumber: undefined }));
          }
        }}
      />
      <Select aria-label={t("business:orderspage.filterStores")} placeholder={t("business:stores.allStores")} allowClear showSearch optionFilterProp="label" value={query.storeId}
        options={stores.map(store => ({ value: store.id, label: store.name }))} onChange={storeId => setQuery(current => ({ ...current, page: 0, storeId }))} />
      <Select aria-label={t("admin:ui.filterOrderStatus")} placeholder={t("business:paymentspage.allStatuses")} allowClear value={query.status}
        options={["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "SHIPPING", "COMPLETED", "CANCELLED"].map(status => ({ value: status, label: t(orderStatusKeys[status as AdminOrder["status"]]) }))}
        onChange={status => setQuery(current => ({ ...current, page: 0, status }))} />
    </div>
    {storeError && <Alert type="warning" message={storeError} />}
    {error && <Alert type="error" message={error} />}

    {loading && orders.length === 0 ? (
      <div className="admin-orders-loading-box">
        <Spin size="large" />
      </div>
    ) : groupedByDate.length === 0 ? (
      <div className="admin-orders-empty-box">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noOrdersMatchYourFilters")} />
      </div>
    ) : (
      <div className="admin-orders-date-groups">
        {groupedByDate.map(([dateKey, dayOrders]) => {
          const dayCompleted = dayOrders.filter(o => o.status === "COMPLETED").length;
          const dayPaid = dayOrders.filter(o => ["PAID", "COLLECTED"].includes(o.paymentStatus)).length;
          const dayRevenue = dayOrders
            .filter(o => o.status !== "CANCELLED" && ["PAID", "COLLECTED"].includes(o.paymentStatus))
            .reduce((sum, o) => sum + o.total, 0);
          return (
            <section key={dateKey} className="admin-orders-date-group">
              <div className="admin-orders-date-group-header">
                <div className="admin-orders-date-group-title">
                  <CalendarOutlined />
                  <strong>
                    {dateKey === todayVn ? t("business:dateFilter.todayPrefix") : ""}
                    {formatDateLabelVn(dateKey, locale)}
                  </strong>
                  <Tag color="red">{t("business:dateFilter.ordersFullUnit", { count: dayOrders.length })}</Tag>
                  <Tag color="green">{t("business:dateFilter.completedCountTag", { count: dayCompleted })}</Tag>
                  <Tag color="blue">{t("business:dateFilter.paidCountTag", { count: dayPaid })}</Tag>
                </div>
                <div className="admin-orders-date-group-actions">
                  <span className="admin-orders-date-group-revenue">
                    {t("business:dateFilter.dailyNetRevenue")} <strong>{money(dayRevenue)}</strong>
                  </span>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleExportExcel(dayOrders, dateKey)}
                  >
                    {t("business:dateFilter.exportExcelDay", { date: dateKey.split("-").reverse().join("/") })}
                  </Button>
                </div>
              </div>
              <Table<AdminOrder>
                rowKey="id"
                size="middle"
                loading={loading}
                dataSource={dayOrders}
                scroll={{ x: 1120 }}
                pagination={false}
                columns={columns}
              />
            </section>
          );
        })}
      </div>
    )}

    {total > 0 && (
      <div className="admin-orders-pagination-bar">
        <Pagination
          current={query.page + 1}
          pageSize={query.size}
          total={total}
          showSizeChanger
          pageSizeOptions={[20, 50, 100]}
          showTotal={count => t("admin:ui.orders", { value1: count.toLocaleString("vi-VN") })}
          onChange={(page, size) =>
            setQuery(current => ({
              ...current,
              page: size === current.size ? page - 1 : 0,
              size,
            }))
          }
        />
      </div>
    )}
    </div>
    {selectedId !== null && <AdminOrderDrawer key={`order-details:${selectedId}`} order={selected} refund={refund} loading={detailLoading} error={detailError} refundError={refundError}
      covered={financeId !== null}
      storeName={stores.find(store => store.id === selected?.storeId)?.name} onClose={() => { setSelectedId(null); refresh(); }}
      onFinance={() => setFinanceId(Number(selectedId))} onChanged={refresh} />}
    {financeId !== null && <FinanceModal key={`order-finance:${financeId}`} orderId={financeId} stores={stores} onClose={() => { setFinanceId(null); refresh(); }} onChanged={refresh} />}
  </div>;
}
