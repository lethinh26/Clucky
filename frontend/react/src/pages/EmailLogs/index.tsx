import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.ts";
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage } from '../../lib/api';
import { adminNotificationsApi, type EmailLog, type EmailLogFilters, type EmailStatus, type NotificationPage } from '../../lib/admin-notifications';
import { EmailDetails } from './EmailDetails';

const statusLabels: Record<EmailStatus, string> = {
  get QUEUED() { return i18n.t("admin:ui.queued"); }, get SENDING() { return i18n.t("admin:ui.sending"); }, get SENT() { return i18n.t("admin:ui.sent"); }, get FAILED() { return i18n.t("business:orderdetaildrawer.failed"); }, get EXPIRED() { return i18n.t("business:paymentstatusbadge.expired"); },
};

interface SearchValues { recipient?: string; status?: EmailStatus; template?: string; from?: string; to?: string }

export function EmailLogsPage() {
  const { t } = useTranslation();
  const { isAdmin, user } = useAuth();
  const canRead = isAdmin || user.role === 'STORE_MANAGER';
  const { date } = useLocaleTools();
  const [form] = Form.useForm<SearchValues>();
  const [filters, setFilters] = useState<EmailLogFilters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<NotificationPage<EmailLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    adminNotificationsApi.emailLogs(page, size, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [canRead, user.id, user.storeId, page, size, filters, reload]);

  function search(values: SearchValues) {
    if (values.from && values.to && values.from > values.to) {
      form.setFields([{ name: 'to', errors: [t("admin:ui.theEndDateMustBeOnOrAfter")] }]);
      return;
    }
    const to = values.to ? new Date(new Date(`${values.to}T00:00:00+07:00`).getTime() + 86400000) : null;
    setPage(0);
    setFilters({ recipient: values.recipient?.trim() || undefined, status: values.status, template: values.template?.trim() || undefined,
      from: values.from ? new Date(`${values.from}T00:00:00+07:00`).toISOString() : undefined,
      to: to?.toISOString() });
  }

  const columns: TableColumnsType<EmailLog> = [
    { title: t("admin:ui.recipientMasked"), dataIndex: 'toEmail', key: 'recipient' },
    { title: t("admin:ui.subject"), dataIndex: 'subject', key: 'subject', render: (subject: string) => subject || t("admin:ui.notRenderedYet") },
    { title: t("accounts:status"), dataIndex: 'status', key: 'status', render: (status: EmailStatus) =>
      <Tag color={status === 'SENT' ? 'success' : status === 'FAILED' ? 'error' : 'default'}>{statusLabels[status] ?? status}</Tag> },
    { title: t("admin:ui.emailTemplate"), dataIndex: 'template', key: 'template' },
    { title: t("business:paymentspage.createdAt"), dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => date(value, { dateStyle: 'short', timeStyle: 'short' }) },
    { title: t("admin:ui.sentAt"), dataIndex: 'sentAt', key: 'sentAt', render: (value: string | null) => value ? date(value, { dateStyle: 'short', timeStyle: 'short' }) : '—' },
  ];

  if (!canRead) return <Alert type="error" title={t('admin:emailOps.denied')} />;

  return <Space orientation="vertical" size="large" style={{ width: '100%' }}>
    <div>
      <Typography.Title level={2}>{t("admin:ui.emailLogs")}</Typography.Title>
      <Typography.Paragraph type="secondary">{t('admin:emailOps.description')}</Typography.Paragraph>
    </div>
    <Card>
      <Form form={form} layout="inline" onFinish={search} style={{ gap: 12 }}>
        <Form.Item name="recipient" label={t("admin:ui.recipient")}><Input maxLength={255} placeholder={t("admin:ui.searchEmailAddress")} allowClear autoComplete="off" /></Form.Item>
        <Form.Item name="status" label={t("accounts:status")}><Select allowClear placeholder={t("business:stafforderspage.all")} style={{ width: 150 }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="template" label={t('admin:ui.emailTemplate')} rules={[{ pattern: /^[A-Za-z0-9_-]*$/, message: t('admin:emailOps.templateInvalid') }]}><Input maxLength={100} allowClear placeholder="ORDER_CONFIRMED" /></Form.Item>
        <Form.Item name="from" label={t("admin:ui.createdFrom")}><Input type="date" /></Form.Item>
        <Form.Item name="to" label={t("admin:ui.throughDate")}><Input type="date" /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>{t("admin:ui.search")}</Button></Form.Item>
        <Form.Item><Button onClick={() => { form.resetFields(); setFilters({}); setPage(0); }}>{t("business:orderspage.clearFilters")}</Button></Form.Item>
      </Form>
    </Card>
    {error ? <Alert type="error" showIcon title={t("admin:ui.unableToLoadEmailLogs")} description={error} action={<Button onClick={() => setReload(value => value + 1)}>{t("business:dashboard.retry")}</Button>} /> :
      <Table<EmailLog> rowKey="id" columns={columns} dataSource={result?.content ?? []} loading={loading} scroll={{ x: 1000 }}
        expandable={{ expandedRowRender: entry => <EmailDetails key={`${entry.id}:${user.id}:${reload}`} id={entry.id} onRetried={() => setReload(value => value + 1)} /> }}
        locale={{ emptyText: loading ? t("business:loadingsurface.loading") : t("admin:ui.noMatchingEmails") }}
        pagination={{ current: page + 1, pageSize: size, total: result?.totalElements ?? 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], onChange: (nextPage, nextSize) => { setPage(nextSize !== size ? 0 : nextPage - 1); setSize(nextSize); } }} />}
  </Space>;
}

export default EmailLogsPage;
