import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Alert, Button, Card, Checkbox, DatePicker, Descriptions, Drawer, Empty, Input, Popconfirm, Segmented, Select, Space, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, type Store } from "../../lib/api";
import { useLocaleTools } from "../../i18n/hooks";
import { useAuth } from "../../context/AuthContext";
import { notify } from "../../components/feedback";
import { FinanceLookup, ReceiptConflictList } from "./FinanceDrawer";

interface Receipt {
  id: string; transactionId: string; amount: number; direction: string | null; bank: string | null;
  maskedAccount: string; content: string | null; receivedAt: string; bankOccurredAt: string | null;
  status: string; reason: string | null; storeId: number | null; matchedOrderCode: string | null;
  candidateOrderCode: string | null; replayCount: number; conflictCount: number; version: number;
  bankStoreIds: number[]; bankScopeSource: string; canAssign: boolean;
  assignedBy: number | null; assignedAt: string | null; assignmentReason: string | null;
}
interface Inbox {
  page: { content: Receipt[]; page: number; size: number; totalElements: number }; lastReceivedAt: string | null;
}
interface Payment { id: number; version: number; live_payment: boolean; method: string; status: string; amount: number; received_amount: number; expires_at: string }
interface Snapshot {
  order: { orderId: number; orderCode: string; storeId: number; amount: number; status: string; paymentStatus: string; expiresAt: string | null };
  payments: Payment[];
}
interface Query { page: number; size: number; status?: string; storeId?: number; search?: string; bank?: string; from?: string; to?: string; unclassifiedOnly?: boolean; conflictsOnly?: boolean }

export function TransactionsPanel({ stores, revision }: { stores: Store[]; revision: number }) {
  const { isAdmin, user } = useAuth();
  const { t } = useTranslation("payments");
  const { money, date } = useLocaleTools();
  const [query, setQuery] = useState<Query>({ page: 0, size: 20 });
  const [refresh, setRefresh] = useState(0);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [reason, setReason] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const pending = useRef<{ path: string; body: object; key: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; lookup.current?.abort(); }; }, []);

  useEffect(() => {
    if (!isAdmin || selectedId) return;
    const timer = window.setTimeout(() => setRefresh(value => value + 1), 15000);
    return () => window.clearTimeout(timer);
  }, [isAdmin, selectedId, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setInbox(null);
    const params = { ...query, from: query.from ? `${query.from}T00:00:00+07:00` : undefined, to: query.to ? `${query.to}T23:59:59.999+07:00` : undefined };
    void api.get<Inbox>("/api/payments/transactions", { params, signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setInbox(response.data); })
      .catch(failure => { if (!controller.signal.aborted) { setInbox(null); setError(getErrorMessage(failure)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision, refresh]);

  useEffect(() => {
    lookup.current?.abort(); setLookupLoading(false); setSnapshot(null); setOrderCode(""); setReason(""); setAssignmentError("");
    pending.current = null; setUncertain(false); setReceipt(null); setDetailError("");
    if (!selectedId) return;
    const controller = new AbortController();
    setDetailLoading(true);
    void api.get<Receipt>(`/api/payments/transactions/${selectedId}`, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setReceipt(response.data); })
      .catch(failure => { if (!controller.signal.aborted) setDetailError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, refresh]);

  function filter(change: Partial<Query>) { setQuery(current => ({ ...current, ...change, page: 0 })); }
  function storeName(storeId: number) { return stores.find(store => store.id === storeId)?.name || (user.storeId === storeId ? user.storeName : null) || `#${storeId}`; }
  function time(value: string) { return date(value, { hour: "2-digit", minute: "2-digit" }); }
  function statusTag(entry: Receipt) { return <Tag color={entry.conflictCount > 0 ? "red" : entry.status === "MATCHED" ? "green" : entry.status === "IGNORED" ? "default" : "orange"}>{t(entry.conflictCount > 0 ? "conflictsOnly" : `receiptStatuses.${entry.status}`)}</Tag>; }
  const payment = snapshot?.payments.find(item => item.live_payment && item.method === "BANK_TRANSFER" && item.status === "PENDING" && new Date(item.expires_at).getTime() > Date.now());
  const remaining = payment ? Math.max(0, payment.amount - payment.received_amount) : 0;

  async function findOrder() {
    lookup.current?.abort();
    if (!receipt || !orderCode.trim() || assigning || uncertain) return;
    const controller = new AbortController(); lookup.current = controller;
    setLookupLoading(true); setSnapshot(null); setAssignmentError("");
    try {
      const order = await api.get<{ id: number }>(`/api/orders/code/${encodeURIComponent(orderCode.trim())}`, { signal: controller.signal });
      const response = await api.get<Snapshot>(`/api/payments/${order.data.id}/operations`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const next = response.data;
      if (next.order.status !== "PENDING_PAYMENT" || next.order.paymentStatus !== "PENDING" || !next.order.expiresAt || new Date(next.order.expiresAt).getTime() <= Date.now()
          || !next.payments.some(item => item.live_payment && item.method === "BANK_TRANSFER" && item.status === "PENDING" && new Date(item.expires_at).getTime() > Date.now())) {
        setAssignmentError(t("log.orderNotPayable")); return;
      }
      if ((!isAdmin && next.order.storeId !== user.storeId) || (receipt.storeId !== null && receipt.storeId !== next.order.storeId)
          || (!isAdmin && receipt.storeId === null && !receipt.bankStoreIds.includes(next.order.storeId))) {
        setAssignmentError(t("log.wrongStore")); return;
      }
      setSnapshot(next);
    } catch (failure) { if (!controller.signal.aborted) setAssignmentError(getErrorMessage(failure)); }
    finally { if (!controller.signal.aborted) setLookupLoading(false); }
  }

  async function assign() {
    if (!receipt || !snapshot || !payment || assigning || !reason.trim() || !Number.isSafeInteger(Number(receipt.id))) return;
    const operation = pending.current ?? { path: `/api/payments/${snapshot.order.orderId}/operations/assign`, key: crypto.randomUUID(),
      body: { receiptId: Number(receipt.id), receiptVersion: receipt.version, paymentId: payment.id, targetVersion: payment.version, reason: reason.trim() } };
    pending.current = operation;
    setAssigning(true); setAssignmentError("");
    try {
      await api.post(operation.path, operation.body, { headers: { "Idempotency-Key": operation.key } });
      if (!alive.current) return;
      pending.current = null; setUncertain(false); notify.success(t("log.assigned")); setRefresh(value => value + 1);
    } catch (failure) {
      if (!alive.current) return;
      const unknown = !isAxiosError(failure) || !failure.response || failure.response.status >= 500;
      setUncertain(unknown);
      if (!unknown) pending.current = null;
      setAssignmentError(unknown ? t("log.uncertain") : getErrorMessage(failure));
    } finally { if (alive.current) setAssigning(false); }
  }

  return <Card className="payment-log-card">
    <div className="payment-log-toolbar"><div><Typography.Title level={4}>{t("log.title")}</Typography.Title><Typography.Text type="secondary">{t("log.total", { count: inbox?.page.totalElements ?? 0 })}</Typography.Text></div>
      {!isAdmin && <Button loading={loading} onClick={() => setRefresh(value => value + 1)} disabled={assigning}>{t("reload")}</Button>}</div>
    <div className="payment-log-filters">
      {isAdmin && <Checkbox checked={query.conflictsOnly} onChange={event => filter({ conflictsOnly: event.target.checked })}>Chỉ biên nhận có xung đột</Checkbox>}
      <Input.Search aria-label={t("searchReceipts")} placeholder={t("log.search")} allowClear maxLength={160} onSearch={search => filter({ search: search.trim() || undefined })} enterButton={t("search")} />
      {isAdmin && <Select aria-label={t("log.contentStore")} placeholder={t("log.contentStore")} showSearch allowClear disabled={query.unclassifiedOnly} optionFilterProp="label" value={query.storeId} onChange={storeId => filter({ storeId })} options={stores.map(store => ({ value: store.id, label: store.name }))} />}
      <Input.Search aria-label={t("bankName")} placeholder={t("log.bankFilter")} allowClear maxLength={100} onSearch={bank => filter({ bank: bank.trim() || undefined })} />
      <Select aria-label={t("receiptStatus")} placeholder={t("allStatuses")} allowClear value={query.status} onChange={status => filter({ status })}
        options={["UNMATCHED", "PENDING_RECONCILIATION", "MATCHED", "LATE_RECEIPT", "IGNORED"].map(status => ({ value: status, label: t(`receiptStatuses.${status}`) }))} />
    </div>
    <div className="payment-log-secondary"><Segmented value={query.unclassifiedOnly ? "unknown" : "all"} onChange={value => filter({ unclassifiedOnly: value === "unknown", storeId: undefined, status: undefined })}
      options={[{ value: "all", label: t("log.all") }, { value: "unknown", label: t("log.unidentified") }]} />
      <Space wrap><label>{t("fromDate")} <DatePicker aria-label={t("fromDate")} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" value={query.from ? dayjs(query.from) : null} onChange={value => filter({ from: value?.format("YYYY-MM-DD") })} /></label>
        <label>{t("toDate")} <DatePicker aria-label={t("toDate")} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" value={query.to ? dayjs(query.to) : null} onChange={value => filter({ to: value?.format("YYYY-MM-DD") })} /></label></Space></div>
    {error && <Alert type="error" showIcon message={error} />}
    <div className="payments-table-scroll" role="region" aria-label={t("transactionsTab")} tabIndex={0}>
      <Table<Receipt> rowKey="id" dataSource={inbox?.page.content ?? []} loading={loading} style={{ minWidth: 1080 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("noReceipts")} /> }}
        pagination={{ current: query.page + 1, pageSize: query.size, total: inbox?.page.totalElements ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100], onChange: (page, size) => setQuery(current => ({ ...current, page: size === current.size ? page - 1 : 0, size })) }}
        columns={[
          { title: t("receivedAt"), width: 155, render: (_, entry) => <><span>{time(entry.receivedAt)}</span><small className="payment-log-muted">{entry.transactionId}</small></> },
          { title: t("amount"), align: "right", width: 135, render: (_, entry) => <Typography.Text strong>{money(entry.amount)}</Typography.Text> },
          { title: t("receivingAccount"), width: 150, render: (_, entry) => <>{entry.bank || "—"}<small className="payment-log-muted">{entry.maskedAccount}</small></> },
          { title: t("transferContent"), width: 210, render: (_, entry) => <span className="payment-log-content">{entry.content || "—"}</span> },
          { title: t("store"), render: (_, entry) => entry.storeId ? storeName(entry.storeId) : <Tag>{t("unclassified")}</Tag> },
          { title: t("linkedOrder"), render: (_, entry) => entry.matchedOrderCode || (entry.candidateOrderCode ? <>{entry.candidateOrderCode}<small className="payment-log-muted">{t("candidateOnly")}</small></> : "—") },
          { title: t("receiptStatus"), render: (_, entry) => statusTag(entry) },
          { title: t("actions"), width: 110, render: (_, entry) => <Button onClick={() => setSelectedId(entry.id)}>{t("log.details")}</Button> },
        ]} />
    </div>
    {inbox?.lastReceivedAt && <Typography.Text type="secondary">{t("lastWebhook")}: {time(inbox.lastReceivedAt)}</Typography.Text>}
    <Drawer open={selectedId !== null} onClose={() => { if (!assigning) setSelectedId(null); }} title={t("log.detailTitle")} width="min(600px, 100vw)"
      closable={!assigning} maskClosable={!assigning} keyboard={!assigning} className="payment-receipt-drawer">
      {detailLoading ? <Spin /> : detailError ? <Alert type="error" message={detailError} action={!isAdmin && <Button onClick={() => setRefresh(value => value + 1)}>{t("reload")}</Button>} /> : receipt && <>
        <div className="payment-receipt-amount"><Typography.Title level={2}>{money(receipt.amount)}</Typography.Title>{statusTag(receipt)}</div>
        <Typography.Text type="secondary" copyable>{receipt.transactionId}</Typography.Text>
        <Descriptions column={1} size="small" className="payment-receipt-fields" items={[
          { key: "bank", label: t("receivingAccount"), children: `${receipt.bank || "—"} · ${receipt.maskedAccount}` },
          { key: "bankTime", label: t("bankTime"), children: receipt.bankOccurredAt ? time(receipt.bankOccurredAt) : "—" },
          { key: "received", label: t("receivedAt"), children: time(receipt.receivedAt) },
          { key: "branch", label: t("log.confirmedStore"), children: receipt.storeId ? storeName(receipt.storeId) : t("unclassified") },
          { key: "order", label: t("linkedOrder"), children: receipt.matchedOrderCode || "—" },
        ]} />
        <div className="payment-receipt-section"><Typography.Text type="secondary">{t("transferContent")}</Typography.Text><p className="payment-receipt-content">{receipt.content || t("log.noContent")}</p></div>
        {receipt.storeId === null && <div className="payment-receipt-section"><Typography.Title level={5}>{t("log.possibleStores")}</Typography.Title>
          <Space wrap>{receipt.bankStoreIds?.length ? receipt.bankStoreIds.map(storeId => <Tag key={storeId}>{storeName(storeId)}</Tag>) : <Typography.Text type="secondary">{t("log.noSuggestions")}</Typography.Text>}</Space>
          <p className="payment-log-muted">{t(receipt.bankScopeSource === "CURRENT_CONFIG_BACKFILL" ? "log.backfillHint" : "log.suggestionsHint")}</p></div>}
        {receipt.assignedAt && <Alert type="success" showIcon message={t("log.assignmentHistory", { actor: receipt.assignedBy, time: time(receipt.assignedAt) })} description={receipt.assignmentReason} />}
        {receipt.conflictCount > 0 && <Alert type="warning" showIcon message={t("conflictHelp")} />}
        {isAdmin && receipt.conflictCount > 0 && <ReceiptConflictList key={`${receipt.id}-${receipt.version}`} receiptId={receipt.id} />}
        {!isAdmin && receipt.canAssign && <div className="payment-receipt-section"><Typography.Title level={4}>{t("log.assignTitle")}</Typography.Title>
          <Input.Search aria-label={t("log.orderCode")} placeholder={t("log.orderPlaceholder")} maxLength={80} value={orderCode} loading={lookupLoading} disabled={assigning || uncertain}
            enterButton={t("log.findOrder")} onSearch={() => void findOrder()} onChange={event => { lookup.current?.abort(); setLookupLoading(false); setOrderCode(event.target.value); setSnapshot(null); setAssignmentError(""); }} />
          {snapshot && payment && <div className="payment-order-preview"><strong>{snapshot.order.orderCode}</strong><span>{storeName(snapshot.order.storeId)}</span>
            <div>{t("log.remaining")}: <strong>{money(remaining)}</strong></div>
            <div>{t(receipt.amount > remaining ? "log.excessAfter" : "log.remainingAfter")}: <strong>{money(Math.abs(remaining - receipt.amount))}</strong></div>
            <label>{t("log.evidence")}<Input.TextArea value={reason} maxLength={500} rows={2} disabled={assigning || uncertain} placeholder={t("log.evidencePlaceholder")} onChange={event => setReason(event.target.value)} /></label>
            <Popconfirm title={t("log.confirmAssign", { amount: money(receipt.amount), order: snapshot.order.orderCode })} description={storeName(snapshot.order.storeId)} onConfirm={() => void assign()} okText={t("log.assign")} cancelText={t("cancel")} disabled={!reason.trim() || assigning}>
              <Button type="primary" loading={assigning} disabled={!reason.trim()}>{t(uncertain ? "log.retryAssignment" : "log.assign")}</Button>
            </Popconfirm></div>}
          {assignmentError && <Alert type="error" showIcon message={assignmentError} action={!assigning && <Button onClick={() => setRefresh(value => value + 1)}>{t("reload")}</Button>} />}
        </div>}
      </>}
      {isAdmin && selectedId && <FinanceLookup key={selectedId} receiptId={selectedId}
        initialCode={receipt?.matchedOrderCode || receipt?.candidateOrderCode || undefined} onChanged={() => setRefresh(value => value + 1)} />}
    </Drawer>
  </Card>;
}
