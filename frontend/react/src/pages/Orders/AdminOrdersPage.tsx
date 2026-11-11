import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import { FileTextOutlined, SearchOutlined, WalletOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../i18n/hooks";
import { OrderStatusBadge } from "../../components/ui/OrderStatusBadge";
import { orderStatusKeys } from "../../components/ui/OrderProgress";
import { adminFinance, orderForAdmin, type OrderQuery } from "../../lib/admin-finance";
import { getErrorMessage, ordersApi, storesApi, type BackendOrder, type BackendRefund, type Store } from "../../lib/api";
import type { AdminOrder } from "../../types/order";
import { AdminOrderDrawer } from "./components/AdminOrderDrawer";
import { FinanceModal } from "../Payments/FinanceDrawer";
import { orderDate, paymentColor, paymentMethodLabel } from "./presentation";
import "./admin-orders.css";

export function AdminOrdersPage() {
  const { t } = useTranslation();
  const { money, locale } = useLocaleTools();
  const [params] = useSearchParams();
  const customer = params.get("customerId");
  const linkedOrderCode = params.get("orderCode")?.trim() || undefined;
  const invalidOrderCode = linkedOrderCode !== undefined && (linkedOrderCode.length > 80 || linkedOrderCode.includes("\0"));
  const customerId = customer && /^[1-9]\d*$/.test(customer) && Number.isSafeInteger(Number(customer)) ? Number(customer) : undefined;
  const invalidCustomer = customer !== null && customerId === undefined;
  const [query, setQuery] = useState<OrderQuery>({ page: 0, size: 20, orderCode: linkedOrderCode });
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
      setOrders(page.content.map(order => orderForAdmin(order))); setTotal(page.totalElements);
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, customerId, invalidCustomer, invalidOrderCode, revision]);
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

  return <div className="admin-orders">
    <header className="admin-orders-heading"><div><span className="order-eyebrow">QUẢN TRỊ TOÀN HỆ THỐNG</span>
      <Typography.Title level={2}>Quản lý đơn hàng</Typography.Title>
      <Typography.Text type="secondary">Theo dõi đơn hàng, thanh toán và hoàn tiền tại các chi nhánh.</Typography.Text></div>
      <Tag icon={<FileTextOutlined />}>{total.toLocaleString('vi-VN')} đơn hàng</Tag></header>
    {customerId && <Alert type="info" message={`Đang lọc đơn của khách hàng #${customerId}`} />}
    {invalidCustomer && <Alert type="error" message="customerId trên URL không hợp lệ; không tải danh sách toàn chuỗi thay thế." />}
    {invalidOrderCode && <Alert type="error" message="Mã đơn trên URL không hợp lệ." />}
    <div className="admin-orders-list">
    <div className="admin-orders-filters">
      <Input.Search aria-label="Tìm mã đơn" placeholder="Tìm theo mã đơn hàng" prefix={<SearchOutlined />} defaultValue={linkedOrderCode} allowClear maxLength={80} onSearch={orderCode => setQuery(current => ({ ...current, page: 0, orderCode: orderCode.trim() || undefined }))} />
      <Select aria-label="Lọc chi nhánh" placeholder="Tất cả chi nhánh" allowClear showSearch optionFilterProp="label" value={query.storeId}
        options={stores.map(store => ({ value: store.id, label: store.name }))} onChange={storeId => setQuery(current => ({ ...current, page: 0, storeId }))} />
      <Select aria-label="Lọc trạng thái đơn" placeholder="Tất cả trạng thái" allowClear value={query.status}
        options={["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "SHIPPING", "COMPLETED", "CANCELLED"].map(status => ({ value: status, label: t(orderStatusKeys[status as AdminOrder["status"]]) }))}
        onChange={status => setQuery(current => ({ ...current, page: 0, status }))} />
    </div>
    {storeError && <Alert type="warning" message={storeError} />}
    {error && <Alert type="error" message={error} />}
    <Table<AdminOrder> rowKey="id" size="middle" loading={loading} dataSource={orders} scroll={{ x: 1120 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có đơn hàng phù hợp bộ lọc" /> }}
      pagination={{ current: query.page + 1, pageSize: query.size, total, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
        showTotal: count => `${count.toLocaleString('vi-VN')} đơn hàng`,
        onChange: (page, size) => setQuery(current => ({ ...current, page: size === current.size ? page - 1 : 0, size })) }} columns={[
        { title: "Đơn hàng", width: 235, render: (_, order) => <div className="order-cell"><Button type="link" onClick={() => openDetail(order.id)}>{order.orderCode}</Button><small>{orderDate(order.createdAt, locale)}</small></div> },
        { title: "Khách hàng", width: 175, render: (_, order) => <div className="order-cell"><strong>{order.customerName}</strong><small>{order.customerPhone || 'Chưa có số điện thoại'}</small></div> },
        { title: "Chi nhánh / nhận món", width: 220, render: (_, order) => <div className="order-cell"><span>{stores.find(store => store.id === Number(order.storeId))?.name || order.storeName}</span><small>{order.orderType === 'PICKUP' ? 'Nhận tại quầy' : 'Giao tận nơi'}</small></div> },
        { title: "Trạng thái", width: 155, render: (_, order) => <OrderStatusBadge status={order.status} /> },
        { title: "Thanh toán", width: 185, render: (_, order) => <div className="order-cell"><Tag color={paymentColor(order.paymentStatus)}>{t(`admin:paymentStates.${order.paymentStatus ?? 'UNKNOWN'}`, { defaultValue: 'Chưa xác minh thanh toán' })}</Tag><small>{paymentMethodLabel(order.paymentMethod)}</small></div> },
        { title: "Tổng tiền", width: 130, align: 'right', dataIndex: "total", render: amount => <strong className="order-amount">{money(amount)}</strong> },
        { title: "Thao tác", width: 125, fixed: 'right', render: (_, order) => <Space direction="vertical" size={0}><Button type="link" size="small" onClick={() => openDetail(order.id)}>Chi tiết</Button>
          <Button type="text" size="small" icon={<WalletOutlined />} onClick={() => setFinanceId(Number(order.id))}>Tài chính</Button></Space> },
      ]} />
    </div>
    {selectedId !== null && <AdminOrderDrawer key={`order-details:${selectedId}`} order={selected} refund={refund} loading={detailLoading} error={detailError} refundError={refundError}
      covered={financeId !== null}
      storeName={stores.find(store => store.id === selected?.storeId)?.name} onClose={() => { setSelectedId(null); refresh(); }}
      onFinance={() => setFinanceId(Number(selectedId))} onChanged={refresh} />}
    {financeId !== null && <FinanceModal key={`order-finance:${financeId}`} orderId={financeId} stores={stores} onClose={() => { setFinanceId(null); refresh(); }} onChanged={refresh} />}
  </div>;
}
