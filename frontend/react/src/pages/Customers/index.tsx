import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, App, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, type BackendOrder, type PageResponse } from '../../lib/api';
import { adminCustomersApi, type AdminCustomer, type CustomerStatus } from '../../lib/admin-customers';
import { StatusTag } from '../Dashboard';

const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN');

export function CustomersPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  return isAdmin ? <CustomerList /> : <Alert type="error" message={t("admin:ui.onlyAdminCanManageCustomers")} />;
}

function CustomerList() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [query, setQuery] = useState<{ keyword: string; status?: CustomerStatus; page: number; size: number }>({ keyword: '', page: 1, size: 20 });
  const [result, setResult] = useState<PageResponse<AdminCustomer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<AdminCustomer | null>(null);
  const [history, setHistory] = useState<AdminCustomer | null>(null);
  const refresh = () => setRevision(current => current + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null);
    adminCustomersApi.list({ ...query, keyword: query.keyword || undefined, page: query.page - 1 }, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        if (query.page > Math.max(1, data.totalPages)) {
          setQuery(current => ({ ...current, page: Math.max(1, data.totalPages) }));
        } else setResult(data);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision]);

  return <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={2}>{t("admin:nav.customers")}</Typography.Title>
    <Typography.Paragraph>{t("admin:ui.searchCustomersAndOrderHistoryAcrossAllBranches")}</Typography.Paragraph>
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search aria-label={t("admin:ui.searchCustomersByNameEmailOrPhoneNumber")} placeholder={t("admin:ui.nameEmailOrPhoneNumber")}
          maxLength={255} allowClear enterButton={t("admin:ui.search")} style={{ width: 'min(100%, 420px)' }}
          onSearch={keyword => setQuery(current => ({ ...current, keyword: keyword.trim(), page: 1 }))} />
        <Select<CustomerStatus> aria-label={t("admin:ui.filterCustomerStatus")} placeholder={t("business:reviews.anyStatus")} allowClear style={{ width: 180 }}
          value={query.status} onChange={status => setQuery(current => ({ ...current, status, page: 1 }))}
          options={[{ value: 'ACTIVE', label: t("admin:ui.active216") }, { value: 'LOCKED', label: t("business:users.locked") }]} />
      </Space>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={refresh}>{t("business:dashboard.retry")}</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminCustomer> rowKey="id" loading={loading} dataSource={result?.content ?? []} scroll={{ x: 950 }}
        locale={{ emptyText: error ? t("admin:ui.unableToLoadData") : loading ? t("business:loadingsurface.loading") : t("admin:ui.noCustomersFound") }}
        pagination={{ current: query.page, pageSize: query.size, total: result?.totalElements ?? 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], showTotal: total => t("admin:ui.customers", { value1: total }),
          onChange: (page, size) => setQuery(current => ({ ...current, page: size !== current.size ? 1 : page, size })) }}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: t("admin:nav.customers"), dataIndex: 'fullName' },
          { title: t("admin:ui.emailMasked"), dataIndex: 'maskedEmail', render: value => value || '—' },
          { title: t("admin:ui.phoneMasked"), dataIndex: 'maskedPhone', render: value => value || '—' },
          { title: t("admin:ui.registrationDate"), dataIndex: 'createdAt', render: dateTime },
          { title: t("accounts:status"), dataIndex: 'status', render: (status: string) => <Tag color={status === 'LOCKED' ? 'error' : 'success'}>{status === 'LOCKED' ? t("business:users.locked") : status === 'ACTIVE' ? t("admin:ui.active216") : status}</Tag> },
          { title: t("accounts:action"), render: (_: unknown, customer: AdminCustomer) => <Space wrap>
            <Button onClick={() => setHistory(customer)}>{t("admin:ui.purchaseHistory")}</Button>
            <Button danger={customer.status === 'ACTIVE'} disabled={!['ACTIVE', 'LOCKED'].includes(customer.status)} onClick={() => setTarget(customer)}>
              {customer.status === 'LOCKED' ? t("accounts:unlock") : t("accounts:lock")}
            </Button>
          </Space> },
        ]} />
    </Card>
    {target && <CustomerStatusModal customer={target} onClose={() => setTarget(null)} onSaved={() => {
      setTarget(null); refresh(); void message.success(t("admin:ui.customerStatusUpdated"));
    }} />}
    {history && <CustomerHistory key={history.id} customer={history} onClose={() => setHistory(null)} />}
  </Space>;
}

function CustomerStatusModal({ customer, onClose, onSaved }: { customer: AdminCustomer; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ reason: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = customer.status === 'ACTIVE';
  async function save(values: { reason: string }) {
    if (busy) return;
    setBusy(true); setError('');
    try { await adminCustomersApi.setLocked(customer, locked, values.reason); onSaved(); }
    catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Modal open title={locked ? t("admin:ui.confirmLockingThisCustomer") : t("admin:ui.confirmUnlockingThisCustomer")}
    okText={locked ? t("business:users.lockAccount") : t("business:users.unlockAccount")} cancelText={t("business:account.cancel")} confirmLoading={busy}
    okButtonProps={{ danger: locked }} cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy}
    onCancel={() => { if (!busy) onClose(); }} onOk={() => form.submit()}>
    <Typography.Paragraph><strong>{customer.fullName}</strong> — ID {customer.id}</Typography.Paragraph>
    <Typography.Paragraph>{locked ? t("admin:ui.allCustomerLoginSessionsWillBeRevokedOrders") : t("admin:ui.theCustomerCanSignInAgainRevokedLogin")}</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
    <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
      <Form.Item name="reason" label={t("admin:ui.reason")} extra={t("admin:ui.theReasonIsRecordedInTheAuditLog")}
        rules={[{ required: true, whitespace: true, message: t("admin:ui.pleaseEnterAReason") },
          { min: 3, max: 500, transform: value => typeof value === 'string' ? value.trim() : value, message: t("admin:ui.theReasonMustBeBetween3And500") }]}>
        <Input.TextArea rows={3} maxLength={500} showCount />
      </Form.Item>
    </Form>
  </Modal>;
}

function CustomerHistory({ customer, onClose }: { customer: AdminCustomer; onClose: () => void }) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState({ page: 1, size: 10 });
  const [result, setResult] = useState<PageResponse<BackendOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null);
    adminCustomersApi.orders(customer.id, pagination.page - 1, pagination.size, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer.id, pagination, revision]);
  return <Drawer open title={t("admin:ui.purchaseHistory239", { value1: customer.fullName, value2: customer.id })} size="large" onClose={onClose}>
    <Typography.Paragraph>{t("admin:ui.includesUnfinishedAndCancelledOrdersOrderTotalsDo")}</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision(current => current + 1)}>{t("business:dashboard.retry")}</Button>} />}
    <Table<BackendOrder> rowKey="id" loading={loading} dataSource={result?.content ?? []} scroll={{ x: 650 }}
      locale={{ emptyText: error ? t("admin:ui.unableToLoadPurchaseHistory") : loading ? t("business:loadingsurface.loading") : t("admin:ui.thisCustomerHasNoOrdersYet") }}
      pagination={{ current: pagination.page, pageSize: pagination.size, total: result?.totalElements ?? 0, showSizeChanger: true,
        pageSizeOptions: [10, 20, 50], showTotal: total => t("admin:ui.orders", { value1: total }),
        onChange: (page, size) => setPagination(current => ({ page: size !== current.size ? 1 : page, size })) }}
      expandable={{ expandRowByClick: true, expandedRowRender: order => <CustomerOrderDetails customerId={customer.id} orderId={order.id} /> }}
      columns={[
        { title: t("business:dashboard.orderCode"), dataIndex: 'orderCode' }, { title: t("admin:ui.branch"), dataIndex: 'storeId' },
        { title: t("admin:ui.orderDate"), dataIndex: 'createdAt', render: dateTime },
        { title: t("admin:ui.orderStatus"), dataIndex: 'status', render: status => <StatusTag status={status} /> },
        { title: t("business:cart.checkout"), dataIndex: 'paymentStatus', render: value => t(`admin:paymentStates.${value ?? 'UNKNOWN'}`, { defaultValue: t("admin:paymentStates.UNKNOWN") }) },
        { title: t("admin:ui.orderTotal"), dataIndex: 'totalAmount', render: money },
      ]} />
  </Drawer>;
}

function CustomerOrderDetails({ customerId, orderId }: { customerId: number; orderId: number }) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null); setError('');
    adminCustomersApi.order(customerId, orderId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setOrder(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); });
    return () => controller.abort();
  }, [customerId, orderId, revision]);
  if (error) return <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision(current => current + 1)}>{t("business:dashboard.retry")}</Button>} />;
  if (!order) return <Spin aria-label={t("admin:ui.loadingOrderDetails")} />;
  return <Space direction="vertical" style={{ width: '100%' }}>
    <Descriptions size="small" column={2} items={[
      { key: 'subtotal', label: t("admin:ui.foodSubtotal"), children: money(order.subtotal) },
      { key: 'discount', label: t("business:ordersummarycard.discount"), children: money(order.discountAmount) },
      { key: 'points', label: t("admin:ui.pointsRedeemed"), children: money(order.pointsAmount) },
      { key: 'shipping', label: t("business:ordersummarycard.deliveryFee"), children: money(order.shippingFee) },
      { key: 'method', label: t("admin:ui.paymentMethod"), children: order.paymentMethod || t("admin:ui.noDataAvailable") },
    ]} />
    <Table rowKey="id" size="small" pagination={false} dataSource={order.items ?? []}
      locale={{ emptyText: t("admin:ui.noItemDataAvailableForThisOrder") }} columns={[
        { title: t("admin:ui.dish"), dataIndex: 'itemName' }, { title: t("admin:ui.quantity"), dataIndex: 'quantity' },
        { title: t("admin:ui.unitPrice"), dataIndex: 'unitPrice', render: money }, { title: t("admin:ui.lineTotal"), dataIndex: 'lineTotal', render: money },
      ]} />
  </Space>;
}
