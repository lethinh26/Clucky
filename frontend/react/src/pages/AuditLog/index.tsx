import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Result, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { getBrowserLocale, getErrorMessage } from '../../i18n/core';
import { auditDomains, exportAuditLogs, getAuditLogs, type AuditFilters, type AuditLogEntry } from '../../lib/admin-audit';
import { storesApi, type Store, type PageResponse } from '../../lib/api';
import { PageIntro } from '../Dashboard';

interface FilterValues {
  action?: string;
  targetType?: string;
  targetId?: number | null;
  sourceService?: string;
  actorId?: number | null;
  storeId?: number | null;
  dates?: [Dayjs, Dayjs] | null;
}

const formatTime = (value: string) => new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value));

export default function AuditLogPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [form] = Form.useForm<FilterValues>();
  const [query, setQuery] = useState<AuditFilters & { page: number; size: number }>({ page: 0, size: 20 });
  const [data, setData] = useState<PageResponse<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState('');
  const exportController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    storesApi.list(false, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setStores(result); setStoreError(''); } })
      .catch(failure => { if (!controller.signal.aborted) setStoreError(getErrorMessage(failure, getBrowserLocale())); });
    return () => controller.abort();
  }, [isAdmin, user.id, refresh]);

  useEffect(() => {
    setData(null);
    setError('');
    setExportError('');
    setExporting(false);
    exportController.current?.abort();
    if (!isAdmin) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    getAuditLogs(query, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setData(response); })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(failure, getBrowserLocale()));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); exportController.current?.abort(); };
  }, [query, refresh, isAdmin, user.id]);

  const applyFilters = (values: FilterValues) => {
    setQuery({
      page: 0, size: query.size,
      sourceService: values.sourceService,
      actorId: values.actorId ?? undefined,
      action: values.action?.trim() || undefined,
      targetType: values.targetType?.trim() || undefined,
      targetId: values.targetId ?? undefined,
      storeId: values.storeId ?? undefined,
      from: values.dates ? new Date(`${values.dates[0].format('YYYY-MM-DD')}T00:00:00+07:00`).toISOString() : undefined,
      to: values.dates ? new Date(`${values.dates[1].format('YYYY-MM-DD')}T23:59:59.999+07:00`).toISOString() : undefined,
    });
  };

  const download = async () => {
    if (!isAdmin || loading || exporting || !data) return;
    const controller = new AbortController();
    exportController.current?.abort();
    exportController.current = controller;
    setExporting(true);
    setExportError('');
    try {
      const { page: _page, size: _size, ...filters } = query;
      const blob = await exportAuditLogs(filters, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-logs.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted) setExportError(getErrorMessage(failure, getBrowserLocale()));
    } finally {
      if (exportController.current === controller) {
        exportController.current = null;
        setExporting(false);
      }
    }
  };

  const columns: TableColumnsType<AuditLogEntry> = [
    { title: t("admin:ui.timeVietnam"), dataIndex: 'occurredAt', render: formatTime, width: 185 },
    { title: t("admin:ui.domain"), dataIndex: 'sourceService', render: (value: string) => auditDomains.find((domain) => domain.value === value)?.label ?? value },
    { title: t("admin:ui.actingAccount"), render: (_, entry) => <Space wrap><Typography.Text>#{entry.actorId}</Typography.Text><Tag>{entry.actorRole}</Tag></Space> },
    { title: t("business:party.store"), dataIndex: 'storeId', render: (value: number | null) => value == null ? t("admin:ui.allBranchesNoBranchAssigned") : stores.find(store => store.id === value)?.name ?? `#${value}` },
    { title: t("accounts:action"), dataIndex: 'action' },
    { title: t("admin:ui.target"), render: (_, entry) => `${entry.targetType} #${entry.targetId}` },
  ];

  if (!isAdmin) return <Result status="403" title={t("business:users.notPermitted")} subTitle={t("admin:ui.onlyAdminCanAccessSystemWideAuditLogs")} />;

  return (
    <div style={{ fontFamily: 'Quicksand, sans-serif' }}>
      <PageIntro eyebrow={t("admin:ui.systemAdministrator")} title={t("admin:ui.activityLog")}
        description={t("admin:ui.historyRecordedByAuditServiceASharedAccount")}
        action={<Space wrap>
          <Button icon={<DownloadOutlined />} loading={exporting} disabled={loading || !data || exporting} onClick={download}>{t("admin:ui.exportCsv")}</Button>
        </Space>} />
      <Alert showIcon type="info" style={{ marginBottom: 16 }}
        message={t("admin:ui.logsArriveAsynchronouslyAnEmptyListDoesNot")}
        description={t("admin:ui.datesUseVietnamTimeExportUpTo10")} />
      <Card style={{ marginBottom: 16, background: '#FFFAF3' }}>
        <Form form={form} layout="vertical" onFinish={applyFilters}>
          <Space wrap align="start">
            <Form.Item name="sourceService" label={t("admin:ui.domain")}>
              <Select allowClear placeholder={t("admin:ui.allDomains")} options={auditDomains} style={{ width: 225 }} />
            </Form.Item>
            <Form.Item name="actorId" label={t("admin:ui.accountId")} rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER, message: t("admin:ui.enterAPositiveIntegerId") }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name="storeId" label={t("business:party.store")}>
              <Select allowClear showSearch optionFilterProp="label" placeholder={t("business:dashboard.scopeChain")} style={{ width: 230 }}
                options={stores.map(store => ({ value: store.id, label: store.name }))} />
            </Form.Item>
            <Form.Item name="dates" label={t("admin:ui.dateRangeVietnam")}>
              <DatePicker.RangePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="action" label={t("admin:ui.actionCode")} rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: t("admin:ui.invalidActionCode") }]}>
              <Input allowClear placeholder={t("admin:ui.exampleCustomerLocked")} maxLength={100} style={{ width: 230 }} />
            </Form.Item>
            <Form.Item name="targetType" label={t("admin:ui.targetType")} rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: t("admin:ui.invalidTargetType") }]}>
              <Input allowClear placeholder={t("admin:ui.exampleOrderCustomer")} maxLength={100} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="targetId" label={t("admin:ui.targetId")} rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} style={{ width: 170 }} />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" htmlType="submit">{t("admin:ui.applyFilters")}</Button>
            <Button onClick={() => { form.resetFields(); setQuery({ page: 0, size: query.size }); }}>{t("business:orderspage.clearFilters")}</Button>
          </Space>
        </Form>
      </Card>
      {storeError && <Alert type="warning" showIcon message={storeError} style={{ marginBottom: 16 }}
        action={<Button onClick={() => setRefresh(value => value + 1)}>{t("admin:ui.retryLoadingBranches")}</Button>} />}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }}
        action={<Button onClick={() => setRefresh((value) => value + 1)}>{t("business:dashboard.retry")}</Button>} />}
      {exportError && <Alert type="error" showIcon message={exportError} description={t("admin:ui.narrowYourFiltersIfTheExportLimitIs")} style={{ marginBottom: 16 }} />}
      <Table<AuditLogEntry> rowKey="eventId" columns={columns} dataSource={data?.content ?? []} loading={loading}
        scroll={{ x: 1100 }} locale={{ emptyText: error ? t("admin:ui.unableToLoadAuditLogs") : t("admin:ui.noLogsMatchYourFilters") }}
        pagination={{ current: query.page + 1, pageSize: query.size, total: data?.totalElements ?? 0,
          showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200], showTotal: (total) => t("admin:ui.records", { value1: total }),
          onChange: (page, size) => setQuery((current) => ({ ...current, page: size === current.size ? page - 1 : 0, size })),
        }}
        expandable={{ expandedRowRender: (entry) => <>
          <Descriptions size="small" column={1} items={[
            { key: 'event', label: 'Event ID', children: entry.eventId },
            { key: 'correlation', label: 'Correlation ID', children: entry.correlationId },
            { key: 'received', label: t("admin:ui.recordedAtVietnam"), children: formatTime(entry.createdAt) },
          ]} />
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(entry.detail, null, 2)}</pre>
        </> }} />
    </div>
  );
}
