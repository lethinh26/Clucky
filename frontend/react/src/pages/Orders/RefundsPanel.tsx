import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Empty, Select, Space, Spin, Table, Tag } from "antd";
import { adminFinance, orderForAdmin, type RefundQuery } from "../../lib/admin-finance";
import { getErrorMessage, ordersApi, refundsApi, type BackendRefund, type PageResponse, type Store } from "../../lib/api";
import { useLocaleTools } from "../../i18n/hooks";
import type { AdminOrder } from "../../types/order";
import { RefundModal } from "./components/RefundModal";
import "./admin-orders.css";

export function RefundsPanel({ orderId, stores = [], revision = 0, onChanged }: {
  orderId?: number; stores?: Store[]; revision?: number; onChanged?: () => void;
}) {
  const { money } = useLocaleTools();
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = {
    PENDING: t("business:refundmodal.statePending"), APPROVED: t("business:refundmodal.stateApproved"),
    PROCESSING: t("business:refundmodal.stateProcessing"), WAITING_BANK_DETAILS: t("business:refundmodal.stateWaitingBank"),
    REFUNDED: t("business:refundmodal.stateRefunded"), REJECTED: t("business:refundmodal.stateRejected"),
  };
  const loadedScope = useRef("");
  const [query, setQuery] = useState<RefundQuery>({ page: 0, size: 20 });
  const [page, setPage] = useState<PageResponse<BackendRefund> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const scope = JSON.stringify({ ...query, orderId });
    if (loadedScope.current !== scope) setPage(null);
    loadedScope.current = scope;
    setLoading(true); setError("");
    void adminFinance.refunds({ ...query, orderId }, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (query.page > 0 && data.content.length === 0) { setQuery(current => ({ ...current, page: Math.max(0, data.totalPages - 1) })); return; }
      setPage(data);
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, orderId, revision, refresh]);

  useEffect(() => {
    if (selected !== null) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRefresh(value => value + 1);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selected]);

  useEffect(() => {
    setOrder(null); setDetailError("");
    if (selected === null) return;
    const controller = new AbortController();
    setDetailLoading(true);
    void refundsApi.get(selected, controller.signal).then(async refund => {
      const detail = await ordersApi.getById(refund.orderId, controller.signal);
      if (!controller.signal.aborted) setOrder(orderForAdmin(detail, refund));
    }).catch(failure => { if (!controller.signal.aborted) setDetailError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected]);

  return <section className="refunds-panel">
    <div className="order-section-heading"><h3>{orderId ? 'Yêu cầu hoàn tiền' : 'Yêu cầu hoàn tiền toàn chuỗi'}</h3>
      <Tag>{page?.totalElements ?? 0} yêu cầu</Tag></div>
    <Space wrap>
      {!orderId && <Select aria-label="Chi nhánh hoàn tiền" placeholder="Tất cả chi nhánh" allowClear style={{ width: 200 }} value={query.storeId}
        options={stores.map(store => ({ value: store.id, label: store.name }))} onChange={storeId => setQuery(current => ({ ...current, storeId, page: 0 }))} />}
      <Select aria-label="Trạng thái hoàn tiền" placeholder="Tất cả trạng thái" allowClear style={{ width: 220 }} value={query.status}
        options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        onChange={status => setQuery(current => ({ ...current, status, page: 0 }))} />
    </Space>
    {error && <Alert type="error" showIcon message={error} />}
    <Table<BackendRefund> rowKey="id" size="small" loading={loading} dataSource={page?.content ?? []} scroll={{ x: orderId ? 520 : 720 }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query.status ? 'Không có yêu cầu phù hợp trạng thái đã chọn' : 'Chưa có yêu cầu hoàn tiền'} /> }}
      pagination={{ current: query.page + 1, pageSize: query.size, total: page?.totalElements ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100],
        hideOnSinglePage: true,
        onChange: (next, size) => setQuery(current => ({ ...current, page: size === current.size ? next - 1 : 0, size })) }} columns={[
        { title: "Yêu cầu", dataIndex: "id", width: 85, render: id => `#${id}` },
        { title: "Đơn hàng", hidden: !!orderId, render: (_, refund) => refund.orderCode || `#${refund.orderId}` },
        { title: "Số tiền", width: 120, align: 'right', dataIndex: "amount", render: amount => <strong className="order-amount">{money(amount)}</strong> },
        { title: "Trạng thái", width: 145, dataIndex: "status", render: status => <Tag color={status === 'REFUNDED' ? 'success' : status === 'REJECTED' ? 'error' : status === 'PENDING' || status === 'WAITING_BANK_DETAILS' ? 'gold' : 'processing'}>{statusLabels[status] ?? status}</Tag> },
        { title: "Lý do", dataIndex: "reason", ellipsis: true },
        { title: "Thao tác", width: 90, render: (_, refund) => <Button type="link" size="small" onClick={() => setSelected(refund.id)}>Chi tiết</Button> },
      ]} />
    {detailLoading && <Spin aria-label="Đang tải chi tiết hoàn tiền" />}
    {detailError && <Alert type="error" message={detailError} />}
    {selected !== null && order?.refundRequestId === selected && <RefundModal key={selected} order={order} open onClose={() => setSelected(null)}
      onChanged={() => { setRefresh(value => value + 1); onChanged?.(); }} />}
  </section>;
}
