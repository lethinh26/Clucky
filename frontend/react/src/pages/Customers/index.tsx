import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { App as AntApp, Alert, Avatar, Button, Descriptions, Input, Select, Space, Tag, Table, Typography } from "antd";
import type { TableColumnsType, TablePaginationConfig } from "antd";
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, ReloadOutlined, UnlockOutlined, UserOutlined } from "@ant-design/icons";
import { AdminTable } from "../../components/ui/AdminTable";
import { AdminDrawer } from "../../components/ui/AdminDrawer";
import { AdminModal } from "../../components/ui/AdminModal";
import { customersApi, getErrorMessage } from "../../lib/api";
import type { AdminCustomer, CustomerListParams, CustomerSortField, CustomerStatus } from "../../lib/api";

const PAGE_SIZE = 20;
const DEFAULT_SORT = "createdAt,desc" as const;

const maskEmail = (value: string) => {
  const [local, domain = ""] = value.split("@");
  return `${local.slice(0, 1)}${"•".repeat(Math.max(3, local.length - 1))}${domain ? `@${domain}` : ""}`;
};
const maskPhone = (value: string) => `${value.slice(0, 3)}${"•".repeat(Math.max(4, value.length - 5))}${value.slice(-2)}`;
const formatDate = (value: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const CustomersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { message } = AntApp.useApp();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | undefined>();
  const [sort, setSort] = useState<CustomerListParams["sort"]>(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminCustomer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [orderHistoryTotal, setOrderHistoryTotal] = useState(0);
  const [orderHistoryPage, setOrderHistoryPage] = useState(0);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistoryError, setOrderHistoryError] = useState<string | null>(null);
  const [unmasked, setUnmasked] = useState(false);
  const [actionTarget, setActionTarget] = useState<AdminCustomer | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const listRequest = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setReadError(null);
    try {
      const data = await customersApi.list({ search: search.trim() || undefined, status, page, size, sort }, controller.signal);
      if (!controller.signal.aborted) {
        setCustomers(data.content);
        setTotal(data.totalElements);
      }
    } catch (error) {
      if (!controller.signal.aborted) setReadError(getErrorMessage(error, t("admin:customers.loadError")));
    } finally {
      if (!controller.signal.aborted && listRequest.current === controller) setLoading(false);
    }
  }, [page, search, size, sort, status, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search === "" ? 0 : 300);
    return () => window.clearTimeout(timer);
  }, [load, search]);
  useEffect(() => () => { listRequest.current?.abort(); detailRequest.current?.abort(); }, []);

  const openDetail = async (customer: AdminCustomer) => {
    setSelected(customer); setUnmasked(false); setDetailLoading(true); setOrderHistory([]); setOrderHistoryPage(0); setOrderHistoryError(null);
    detailRequest.current?.abort();
    const controller = new AbortController(); detailRequest.current = controller;
    try { setSelected(await customersApi.get(customer.id, controller.signal)); }
    catch (error) { if (!controller.signal.aborted) message.error(getErrorMessage(error, t("admin:customers.detailError"))); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  };

  const closeDetail = () => { detailRequest.current?.abort(); setSelected(null); setUnmasked(false); };
  const requestAction = (customer: AdminCustomer) => { setActionTarget(customer); setReason(""); };
  const closeAction = () => { if (!submitting) { setActionTarget(null); setReason(""); } };
  const submitAction = async () => {
    if (!actionTarget || submitting) return;
    const normalizedReason = reason.trim();
    if (normalizedReason.length > 500) { message.error(t("admin:customers.reasonTooLong")); return; }
    setSubmitting(true);
    try {
      const result = actionTarget.status === "ACTIVE"
        ? await customersApi.lock(actionTarget.id, normalizedReason || undefined)
        : await customersApi.unlock(actionTarget.id);
      setCustomers((items) => items.map((item) => item.id === result.customer.id ? result.customer : item));
      setSelected((item) => item?.id === result.customer.id ? result.customer : item);
      message.success(result.changed ? t("admin:customers.actionChanged") : t("admin:customers.actionNoChange"));
      setActionTarget(null); setReason("");
      void load();
    } catch (error) { message.error(getErrorMessage(error, t("admin:customers.actionError"))); }
    finally { setSubmitting(false); }
  };

  const columns: TableColumnsType<AdminCustomer> = [
    { title: t("admin:customers.customer"), key: "customer", sorter: true, render: (_, customer) => <Button type="link" onClick={() => void openDetail(customer)} style={{ height: "auto", padding: 0, textAlign: "left" }}><Space><Avatar src={customer.avatarUrl ?? undefined} icon={<UserOutlined />} /><span><strong>{customer.fullName}</strong><br /><small>{unmasked ? customer.email : maskEmail(customer.email)}</small></span></Space></Button> },
    { title: t("admin:customers.phone"), dataIndex: "phone", render: (phone: string) => <Button type="link" onClick={() => setUnmasked((value) => !value)} icon={unmasked ? <EyeInvisibleOutlined /> : <EyeOutlined />}>{unmasked ? phone : maskPhone(phone)}</Button> },
    { title: t("admin:customers.status"), dataIndex: "status", sorter: true, render: (value: CustomerStatus) => <Tag color={value === "ACTIVE" ? "green" : "red"}>{t(`admin:customers.statuses.${value}`)}</Tag> },
    { title: t("admin:customers.createdAt"), dataIndex: "createdAt", sorter: true, render: (value: string) => formatDate(value, i18n.language) },
    { title: t("admin:customers.actions"), key: "actions", render: (_, customer) => <Space><Button onClick={() => void openDetail(customer)}>{t("admin:customers.view")}</Button><Button danger={customer.status === "ACTIVE"} icon={customer.status === "ACTIVE" ? <LockOutlined /> : <UnlockOutlined />} onClick={() => requestAction(customer)}>{customer.status === "ACTIVE" ? t("admin:customers.lock") : t("admin:customers.unlock")}</Button></Space> },
  ];

  const pagination: TablePaginationConfig = { current: page + 1, pageSize: size, total, showSizeChanger: true, onChange: (next, nextSize) => { setPage(next - 1); if (nextSize !== size) { setSize(nextSize); setPage(0); } } };
  const onTableChange = (_: TablePaginationConfig, __: unknown, sorter: any) => {
    if (sorter?.field && sorter?.order) { setSort(`${sorter.field as CustomerSortField},${sorter.order === "ascend" ? "asc" : "desc"}` as CustomerListParams["sort"]); setPage(0); }
  };
  const detail = selected;
  const isLocking = actionTarget?.status === "ACTIVE";

  return <div style={{ maxWidth: 1440, margin: "0 auto" }}>
    <Typography.Title level={1} style={{ fontFamily: "Fredoka, Quicksand, sans-serif" }}>{t("admin:customers.title")}</Typography.Title>
    <Typography.Paragraph type="secondary">{t("admin:customers.subtitle")}</Typography.Paragraph>
    {readError && <Alert type="error" showIcon message={readError} action={<Button size="small" onClick={() => void load()} icon={<ReloadOutlined />}>{t("admin:customers.retry")}</Button>} style={{ marginBottom: 16 }} />}
    <AdminTable columns={columns} dataSource={customers} rowKey="id" loading={loading} onChange={onTableChange} pagination={pagination} searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(0); }} searchPlaceholder={t("admin:customers.search")} filterNodes={<><Select allowClear placeholder={t("admin:customers.allStatuses")} value={status} onChange={(value) => { setStatus(value); setPage(0); }} style={{ minWidth: 160 }} options={[{ value: "ACTIVE", label: t("admin:customers.statuses.ACTIVE") }, { value: "LOCKED", label: t("admin:customers.statuses.LOCKED") }]} /><Button icon={<ReloadOutlined />} onClick={() => void load()}>{t("admin:customers.refresh")}</Button></>} emptyTitle={t("admin:customers.emptyTitle")} emptyDescription={t("admin:customers.emptyDescription")} />
    <AdminDrawer open={Boolean(detail)} onClose={closeDetail} title={detail?.fullName ?? ""} subtitle={t("admin:customers.detail")} width={600} loading={detailLoading} destroyOnClose>
      {detail && <><Descriptions column={1} bordered size="small"><Descriptions.Item label={t("admin:customers.email")}><Button type="link" onClick={() => setUnmasked((value) => !value)} icon={unmasked ? <EyeInvisibleOutlined /> : <EyeOutlined />}>{unmasked ? detail.email : maskEmail(detail.email)}</Button></Descriptions.Item><Descriptions.Item label={t("admin:customers.phone")}><Button type="link" onClick={() => setUnmasked((value) => !value)}>{unmasked ? detail.phone : maskPhone(detail.phone)}</Button></Descriptions.Item><Descriptions.Item label={t("admin:customers.status")}><Tag color={detail.status === "ACTIVE" ? "green" : "red"}>{t(`admin:customers.statuses.${detail.status}`)}</Tag></Descriptions.Item><Descriptions.Item label={t("admin:customers.emailVerified")}>{detail.emailVerified ? t("admin:customers.yes") : t("admin:customers.no")}</Descriptions.Item><Descriptions.Item label={t("admin:customers.createdAt")}>{formatDate(detail.createdAt, i18n.language)}</Descriptions.Item><Descriptions.Item label={t("admin:customers.updatedAt")}>{formatDate(detail.updatedAt, i18n.language)}</Descriptions.Item></Descriptions><div style={{ marginTop: 20 }}><Typography.Title level={4}>{t("admin:customers.orderHistoryTitle")}</Typography.Title>{orderHistoryError && <Alert type="error" showIcon message={orderHistoryError} />}{!orderHistoryError && <Table loading={orderHistoryLoading} size="small" rowKey="orderId" dataSource={orderHistory} pagination={{ current: orderHistoryPage + 1, pageSize: 20, total: orderHistoryTotal, onChange: async (next) => { if (!detail) return; setOrderHistoryPage(next - 1); setOrderHistoryLoading(true); const c = new AbortController(); detailRequest.current = c; try { const h = await customersApi.orderHistory(detail.id, { page: next - 1, size: 20 }, c.signal); if (!c.signal.aborted) { setOrderHistory(h.content); setOrderHistoryTotal(h.totalElements); } } catch (e) { if (!c.signal.aborted) setOrderHistoryError(getErrorMessage(e, t("admin:customers.orderHistoryError"))); } finally { if (!c.signal.aborted) setOrderHistoryLoading(false); } } }} columns={[{ title: t("admin:customers.orderCode"), dataIndex: "orderCode" }, { title: t("admin:customers.createdAt"), dataIndex: "createdAt", render: (v: string) => formatDate(v, i18n.language) }, { title: t("admin:customers.status"), dataIndex: "status" }, { title: t("admin:customers.totalAmount"), dataIndex: "totalAmount" }, { title: t("admin:customers.orderType"), dataIndex: "orderType" }]} /></>}</div></>}
    </AdminDrawer>
    <AdminModal open={Boolean(actionTarget)} onCancel={closeAction} onOk={() => void submitAction()} confirmLoading={submitting} title={isLocking ? t("admin:customers.lockTitle") : t("admin:customers.unlockTitle")} subtitle={actionTarget?.fullName} okText={isLocking ? t("admin:customers.lock") : t("admin:customers.unlock")} okButtonProps={{ danger: isLocking }}>
      <Typography.Paragraph>{isLocking ? t("admin:customers.lockConfirm", { name: actionTarget?.fullName }) : t("admin:customers.unlockConfirm", { name: actionTarget?.fullName })}</Typography.Paragraph>
      {isLocking && <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} showCount rows={4} placeholder={t("admin:customers.reasonOptional")} aria-label={t("admin:customers.reasonOptional")} />}
    </AdminModal>
  </div>;
};

export default CustomersPage;
