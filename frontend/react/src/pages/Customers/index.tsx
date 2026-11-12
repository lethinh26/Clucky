import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, App, Avatar, Button, Descriptions, Drawer, Form, Input, Modal, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, EyeOutlined, LockOutlined, MailOutlined, PhoneOutlined, ReloadOutlined, SafetyCertificateOutlined, TeamOutlined, UnlockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage, type BackendOrder, type PageResponse } from '../../lib/api';
import { adminCustomersApi, type AdminCustomer, type CustomerStatus } from '../../lib/admin-customers';
import { StatusTag } from '../Dashboard';
import { orderDate, paymentMethodLabel } from '../Orders/presentation';
import styles from './customers.module.css';

export function CustomersPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  return isAdmin ? <CustomerList /> : <Alert type="error" message={t("admin:ui.onlyAdminCanManageCustomers")} />;
}

function CustomerList() {
  const { t } = useTranslation();
  const { locale } = useLocaleTools();
  const { message } = App.useApp();
  const [query, setQuery] = useState<{ keyword: string; status?: CustomerStatus; page: number; size: number }>({ keyword: '', page: 1, size: 20 });
  const [search, setSearch] = useState('');
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
        if (query.page > Math.max(1, data.totalPages)) setQuery(current => ({ ...current, page: Math.max(1, data.totalPages) }));
        else setResult(data);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision]);

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><span className={styles.eyebrow}>{t("admin:customerDirectory.eyebrow")}</span><h1>{t("admin:nav.customers")}</h1><p>{t("admin:customerDirectory.subtitle")}</p></div>
      <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>{t("admin:system.refresh")}</Button>
    </header>
    <section className={styles.metrics} aria-label={t("admin:nav.customers")}>
      {[
        { title: t("admin:customerDirectory.total"), value: result?.totalElements, icon: <TeamOutlined />, tone: 'wine' },
        { title: t("admin:customerDirectory.activeOnPage"), value: result?.content.filter(customer => customer.status === 'ACTIVE').length, icon: <CheckCircleOutlined />, tone: 'green' },
        { title: t("admin:customerDirectory.lockedOnPage"), value: result?.content.filter(customer => customer.status === 'LOCKED').length, icon: <LockOutlined />, tone: 'gold' },
      ].map(metric => <div key={metric.tone} className={styles.metric} data-tone={metric.tone}>
        <span className={styles.metricIcon}>{metric.icon}</span><div><span>{metric.title}</span><strong>{metric.value ?? '—'}</strong></div>
      </div>)}
    </section>
    <section className={styles.directory}>
      <div className={styles.directoryTitle}><h2>{t("admin:customerDirectory.summary")}</h2><span>{result ? t("admin:customerDirectory.result", { count: result.totalElements }) : '—'}</span></div>
      <div className={styles.toolbar}>
        <Input.Search aria-label={t("admin:ui.searchCustomersByNameEmailOrPhoneNumber")} placeholder={t("admin:ui.nameEmailOrPhoneNumber")}
          value={search} onChange={event => setSearch(event.target.value)} maxLength={255} allowClear enterButton={t("admin:ui.search")}
          onSearch={keyword => setQuery(current => ({ ...current, keyword: keyword.trim(), page: 1 }))} />
        <Select<CustomerStatus> aria-label={t("admin:ui.filterCustomerStatus")} placeholder={t("business:reviews.anyStatus")} allowClear
          value={query.status} onChange={status => setQuery(current => ({ ...current, status, page: 1 }))}
          options={[{ value: 'ACTIVE', label: t("admin:ui.active216") }, { value: 'LOCKED', label: t("business:users.locked") }]} />
        {(query.keyword || query.status || search) && <Button onClick={() => { setSearch(''); setQuery(current => ({ ...current, keyword: '', status: undefined, page: 1 })); }}>{t("admin:customerDirectory.clear")}</Button>}
      </div>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={refresh}>{t("business:dashboard.retry")}</Button>} />}
      <Table<AdminCustomer> rowKey="id" loading={loading} dataSource={result?.content ?? []} scroll={{ x: 920 }}
        locale={{ emptyText: error ? t("admin:ui.unableToLoadData") : loading ? t("business:loadingsurface.loading") : t("admin:ui.noCustomersFound") }}
        pagination={{ current: query.page, pageSize: query.size, total: result?.totalElements ?? 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], showTotal: total => t("admin:ui.customers", { value1: total }),
          onChange: (page, size) => setQuery(current => ({ ...current, page: size !== current.size ? 1 : page, size })) }}
        columns={[
          { title: t("admin:nav.customers"), dataIndex: 'fullName', width: 260, render: (_, customer) => <div className={styles.person}>
            <Avatar size={40} icon={<UserOutlined />} className={styles.avatar} />
            <div><button className={styles.nameButton} onClick={() => setHistory(customer)}>{customer.fullName}</button><small>#{customer.id}</small></div>
          </div> },
          { title: t("admin:ui.emailMasked"), dataIndex: 'maskedEmail', render: (_, customer) => <div className={styles.contact}>
            <span><MailOutlined /> {customer.maskedEmail || '—'}</span><small><PhoneOutlined /> {customer.maskedPhone || '—'}</small>
          </div> },
          { title: t("admin:ui.registrationDate"), dataIndex: 'createdAt', render: value => orderDate(value, locale) },
          { title: t("accounts:status"), dataIndex: 'status', render: (status: string) => <Tag color={status === 'LOCKED' ? 'error' : 'success'} icon={status === 'LOCKED' ? <LockOutlined /> : <CheckCircleOutlined />}>{status === 'LOCKED' ? t("business:users.locked") : t("admin:ui.active216")}</Tag> },
          { title: t("accounts:action"), width: 200, render: (_: unknown, customer: AdminCustomer) => <Space>
            <Button icon={<EyeOutlined aria-hidden />} onClick={() => setHistory(customer)}>{t("admin:customerDirectory.details")}</Button>
            <Button icon={customer.status === 'LOCKED' ? <UnlockOutlined /> : <LockOutlined />} danger={customer.status === 'ACTIVE'}
              aria-label={customer.status === 'LOCKED' ? t("accounts:unlock") : t("accounts:lock")}
              disabled={!['ACTIVE', 'LOCKED'].includes(customer.status)} onClick={() => setTarget(customer)} />
          </Space> },
        ]} />
      <p className={styles.privacy}><SafetyCertificateOutlined /> {t("admin:customerDirectory.privacy")}</p>
    </section>
    {target && <CustomerStatusModal customer={target} onClose={() => setTarget(null)} onSaved={updated => {
      setTarget(null); setHistory(current => current?.id === updated.id ? updated : current); refresh(); void message.success(t("admin:ui.customerStatusUpdated"));
    }} />}
    {history && <CustomerHistory key={history.id} customer={history} onClose={() => setHistory(null)} onManage={() => setTarget(history)} />}
  </div>;
}

function CustomerStatusModal({ customer, onClose, onSaved }: { customer: AdminCustomer; onClose: () => void; onSaved: (customer: AdminCustomer) => void }) {
  const { t } = useTranslation();
  const [form] = Form.useForm<{ reason: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = customer.status === 'ACTIVE';
  async function save(values: { reason: string }) {
    if (busy) return;
    setBusy(true); setError('');
    try { const updated = await adminCustomersApi.setLocked(customer, locked, values.reason); onSaved(updated); }
    catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Modal open zIndex={1100} title={locked ? t("admin:ui.confirmLockingThisCustomer") : t("admin:ui.confirmUnlockingThisCustomer")}
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

function CustomerHistory({ customer, onClose, onManage }: { customer: AdminCustomer; onClose: () => void; onManage: () => void }) {
  const { t } = useTranslation();
  const { money, locale } = useLocaleTools();
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
  return <Drawer open title={t("admin:customerDirectory.summary")} size="large" onClose={onClose}>
    <section className={styles.profile} aria-label={t("admin:customerDirectory.profile")}>
      <div className={styles.profileHeading}><Avatar size={56} icon={<UserOutlined />} className={styles.avatar} /><div><h2>{customer.fullName}</h2><span>#{customer.id}</span></div>
        <Tag color={customer.status === 'LOCKED' ? 'error' : 'success'}>{customer.status === 'LOCKED' ? t("business:users.locked") : t("admin:ui.active216")}</Tag>
      </div>
      <Descriptions column={1} size="small" items={[
        { key: 'email', label: t("admin:ui.emailMasked"), children: customer.maskedEmail || '—' },
        { key: 'phone', label: t("admin:ui.phoneMasked"), children: customer.maskedPhone || '—' },
        { key: 'date', label: t("admin:ui.registrationDate"), children: orderDate(customer.createdAt, locale) },
      ]} />
      <div className={styles.profileFooter}><small><SafetyCertificateOutlined /> {t("admin:customerDirectory.privacy")}</small>
        <Button danger={customer.status === 'ACTIVE'} icon={customer.status === 'LOCKED' ? <UnlockOutlined aria-hidden /> : <LockOutlined aria-hidden />} onClick={onManage}>{customer.status === 'LOCKED' ? t("accounts:unlock") : t("accounts:lock")}</Button>
      </div>
    </section>
    <div className={styles.historyHeading}><h3>{t("admin:customerDirectory.history")}</h3><Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRevision(current => current + 1)}>{t("admin:system.refresh")}</Button></div>
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
        { title: t("admin:ui.orderDate"), dataIndex: 'createdAt', render: value => orderDate(value, locale) },
        { title: t("admin:ui.orderStatus"), dataIndex: 'status', render: status => <StatusTag status={status} /> },
        { title: t("business:cart.checkout"), dataIndex: 'paymentStatus', render: value => t(`admin:paymentStates.${value ?? 'UNKNOWN'}`, { defaultValue: t("admin:paymentStates.UNKNOWN") }) },
        { title: t("admin:ui.orderTotal"), dataIndex: 'totalAmount', render: money },
      ]} />
  </Drawer>;
}

function CustomerOrderDetails({ customerId, orderId }: { customerId: number; orderId: number }) {
  const { t } = useTranslation();
  const { money } = useLocaleTools();
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
      { key: 'method', label: t("admin:ui.paymentMethod"), children: paymentMethodLabel(order.paymentMethod) },
    ]} />
    <Table rowKey="id" size="small" pagination={false} dataSource={order.items ?? []}
      locale={{ emptyText: t("admin:ui.noItemDataAvailableForThisOrder") }} columns={[
        { title: t("admin:ui.dish"), dataIndex: 'itemName' }, { title: t("admin:ui.quantity"), dataIndex: 'quantity' },
        { title: t("admin:ui.unitPrice"), dataIndex: 'unitPrice', render: money }, { title: t("admin:ui.lineTotal"), dataIndex: 'lineTotal', render: money },
      ]} />
  </Space>;
}
