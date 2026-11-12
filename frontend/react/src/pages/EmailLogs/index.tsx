import { useTranslation } from "react-i18next";
import i18n from "../../i18n/index.ts";
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { EyeOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage } from '../../lib/api';
import { adminNotificationsApi, type EmailLog, type EmailLogFilters, type EmailStatus, type NotificationPage } from '../../lib/admin-notifications';

const statusLabels: Record<EmailStatus, string> = {
  get QUEUED() { return i18n.t("admin:ui.queued"); },
  get SENDING() { return i18n.t("admin:ui.sending"); },
  get SENT() { return i18n.t("admin:ui.sent"); },
  get FAILED() { return i18n.t("business:orderdetaildrawer.failed"); },
  get EXPIRED() { return i18n.t("business:paymentstatusbadge.expired"); },
};

interface SearchValues {
  recipient?: string;
  status?: EmailStatus;
  template?: string;
  from?: string;
  to?: string;
}

const failureLabels: Record<string, string> = {
  get SMTP_CONNECT_FAILED() { return i18n.t("admin:ui.unableToConnectToSmtpRetriesAreLimited"); },
  get SMTP_OUTCOME_UNKNOWN() { return i18n.t("admin:ui.emailDeliveryIsUncertainCheckWithTheProvider"); },
  get INVALID_TEMPLATE() { return i18n.t("admin:ui.theEmailTemplateOrContentVariablesAreMissing"); },
  get DELIVERY_FAILED() { return i18n.t("admin:ui.emailDeliveryFailedSensitiveProviderDetailsAreNot"); },
};

export function EmailLogsPage() {
  const { t } = useTranslation();
  const { isAdmin, user } = useAuth();
  const { date } = useLocaleTools();
  const [form] = Form.useForm<SearchValues>();
  const [filters, setFilters] = useState<EmailLogFilters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<NotificationPage<EmailLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    adminNotificationsApi.emailLogs(page, size, filters, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isAdmin, user.id, page, size, filters, reload]);

  function search(values: SearchValues) {
    if (values.from && values.to && values.from > values.to) {
      form.setFields([{ name: 'to', errors: [t("admin:ui.theEndDateMustBeOnOrAfter")] }]);
      return;
    }
    const to = values.to ? new Date(new Date(`${values.to}T00:00:00+07:00`).getTime() + 86400000) : null;
    setPage(0);
    setFilters({
      recipient: values.recipient?.trim() || undefined,
      status: values.status,
      template: values.template?.trim() || undefined,
      from: values.from ? new Date(`${values.from}T00:00:00+07:00`).toISOString() : undefined,
      to: to?.toISOString(),
    });
  }

  async function handleRetry(id: number) {
    if (retryingId !== null) return;
    try {
      setRetryingId(id);
      const updated = await adminNotificationsApi.retryEmail(id);
      message.success(t("admin:ui.retryEmailSuccess"));
      setReload(r => r + 1);
      if (selectedLog?.id === id) {
        setSelectedLog(updated);
      }
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setRetryingId(null);
    }
  }

  function renderRetryButton(log: EmailLog) {
    const isSent = log.status === 'SENT';
    const isInProgress = log.status === 'SENDING' || log.status === 'QUEUED';
    const canRetry = log.status === 'FAILED' || log.status === 'EXPIRED';

    if (isSent) {
      return (
        <Tooltip title={t("admin:ui.emailSentCannotRetry")}>
          <Button size="small" disabled icon={<RedoOutlined />}>
            {t("admin:ui.retryEmail")}
          </Button>
        </Tooltip>
      );
    }

    if (isInProgress) {
      return (
        <Tooltip title={t("admin:ui.emailInProgressCannotRetry")}>
          <Button size="small" disabled icon={<RedoOutlined />}>
            {t("admin:ui.retryEmail")}
          </Button>
        </Tooltip>
      );
    }

    if (canRetry) {
      return (
        <Popconfirm
          title={t("admin:ui.retryEmailConfirm")}
          onConfirm={() => handleRetry(log.id)}
          okText={t("common:confirm")}
          cancelText={t("business:account.cancel")}
        >
          <Button
            size="small"
            type="primary"
            icon={<RedoOutlined />}
            loading={retryingId === log.id}
          >
            {t("admin:ui.retryEmail")}
          </Button>
        </Popconfirm>
      );
    }

    return null;
  }

  const columns: TableColumnsType<EmailLog> = [
    { title: t("admin:ui.recipientMasked"), dataIndex: 'toEmail', key: 'recipient' },
    { title: t("admin:ui.subject"), dataIndex: 'subject', key: 'subject', render: (subject: string) => subject || t("admin:ui.notRenderedYet") },
    {
      title: t("accounts:status"),
      dataIndex: 'status',
      key: 'status',
      render: (status: EmailStatus) => (
        <Tag color={status === 'SENT' ? 'success' : status === 'FAILED' ? 'error' : status === 'EXPIRED' ? 'warning' : 'default'}>
          {statusLabels[status] ?? status}
        </Tag>
      ),
    },
    { title: t("admin:ui.emailTemplate"), dataIndex: 'template', key: 'template' },
    { title: t("business:paymentspage.createdAt"), dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => date(value, { dateStyle: 'short', timeStyle: 'short' }) },
    { title: t("admin:ui.sentAt"), dataIndex: 'sentAt', key: 'sentAt', render: (value: string | null) => value ? date(value, { dateStyle: 'short', timeStyle: 'short' }) : '—' },
    {
      title: t("accounts:action"),
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedLog(record)}>
            {t("admin:ui.viewDetail")}
          </Button>
          {renderRetryButton(record)}
        </Space>
      ),
    },
  ];

  if (!isAdmin) return <Alert type="error" title={t("admin:ui.onlyAdminCanViewEmailLogs")} />;

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2}>{t("admin:ui.emailLogs")}</Typography.Title>
        <Typography.Paragraph type="secondary">{t("admin:ui.dataComesFromTheEmailDeliverySystemAddresses")}</Typography.Paragraph>
      </div>
      <Card>
        <Form form={form} layout="inline" onFinish={search} style={{ gap: 12 }}>
          <Form.Item name="recipient" label={t("admin:ui.recipient")}>
            <Input maxLength={255} placeholder={t("admin:ui.searchEmailAddress")} allowClear autoComplete="off" />
          </Form.Item>
          <Form.Item name="status" label={t("accounts:status")}>
            <Select allowClear placeholder={t("business:stafforderspage.all")} style={{ width: 150 }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="template" label={t("admin:ui.emailTemplate")}>
            <Input maxLength={100} allowClear autoComplete="off" />
          </Form.Item>
          <Form.Item name="from" label={t("admin:ui.createdFrom")}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="to" label={t("admin:ui.throughDate")}>
            <Input type="date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>{t("admin:ui.search")}</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); setFilters({}); setPage(0); }}>{t("business:orderspage.clearFilters")}</Button>
          </Form.Item>
        </Form>
      </Card>
      {error ? (
        <Alert type="error" showIcon title={t("admin:ui.unableToLoadEmailLogs")} description={error} action={<Button onClick={() => setReload(value => value + 1)}>{t("business:dashboard.retry")}</Button>} />
      ) : (
        <Table<EmailLog>
          rowKey="id"
          columns={columns}
          dataSource={result?.content ?? []}
          loading={loading}
          scroll={{ x: 1100 }}
          expandable={{
            expandedRowRender: entry => (
              <Descriptions column={2} size="small" items={[
                { key: 'recipient', label: t("admin:ui.recipientMasked"), children: entry.toEmail },
                { key: 'subject', label: t("admin:ui.subject"), children: entry.subject || t("admin:ui.notRenderedYet") },
                { key: 'reason', label: t("admin:ui.diagnostics"), children: entry.failureCode ? failureLabels[entry.failureCode] ?? t("admin:ui.noSafeDiagnosticInformationAvailable") : t("admin:ui.noErrorsRecorded") },
                { key: 'retry', label: t("admin:ui.failedDeliveryAttempts"), children: entry.retryCount },
                { key: 'next', label: t("admin:ui.nextAttempt"), children: entry.nextAttemptAt ? date(entry.nextAttemptAt, { dateStyle: 'short', timeStyle: 'short' }) : t("admin:ui.noRetryScheduled") },
                { key: 'event', label: 'Event ID', children: entry.eventId ?? '—' },
                { key: 'trace', label: 'Correlation ID', children: entry.correlationId ?? '—' },
              ]} />
            ),
          }}
          locale={{ emptyText: loading ? t("business:loadingsurface.loading") : t("admin:ui.noMatchingEmails") }}
          pagination={{
            current: page + 1,
            pageSize: size,
            total: result?.totalElements ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (nextPage, nextSize) => { setPage(nextSize !== size ? 0 : nextPage - 1); setSize(nextSize); },
          }}
        />
      )}

      <Drawer
        title={t("admin:ui.emailLogDetail")}
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        width={560}
        extra={selectedLog && renderRetryButton(selectedLog)}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label={t("admin:ui.recipientMasked")}>
              <strong>{selectedLog.toEmail}</strong>
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.subject")}>
              {selectedLog.subject || t("admin:ui.notRenderedYet")}
            </Descriptions.Item>
            <Descriptions.Item label={t("accounts:status")}>
              <Tag color={selectedLog.status === 'SENT' ? 'success' : selectedLog.status === 'FAILED' ? 'error' : selectedLog.status === 'EXPIRED' ? 'warning' : 'default'}>
                {statusLabels[selectedLog.status] ?? selectedLog.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.emailTemplate")}>
              <Tag color="blue">{selectedLog.template}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("business:paymentspage.createdAt")}>
              {date(selectedLog.createdAt, { dateStyle: 'full', timeStyle: 'medium' })}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.sentAt")}>
              {selectedLog.sentAt ? date(selectedLog.sentAt, { dateStyle: 'full', timeStyle: 'medium' }) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.diagnostics")}>
              {selectedLog.failureCode ? failureLabels[selectedLog.failureCode] ?? selectedLog.failureCode : t("admin:ui.noErrorsRecorded")}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.failedDeliveryAttempts")}>
              {selectedLog.retryCount}
            </Descriptions.Item>
            <Descriptions.Item label={t("admin:ui.nextAttempt")}>
              {selectedLog.nextAttemptAt ? date(selectedLog.nextAttemptAt, { dateStyle: 'full', timeStyle: 'medium' }) : t("admin:ui.noRetryScheduled")}
            </Descriptions.Item>
            <Descriptions.Item label="Event ID">
              <code>{selectedLog.eventId ?? '—'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Correlation ID">
              <code>{selectedLog.correlationId ?? '—'}</code>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Space>
  );
}

export default EmailLogsPage;
