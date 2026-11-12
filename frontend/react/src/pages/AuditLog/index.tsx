import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, InputNumber, Result, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { DownOutlined, DownloadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { getBrowserLocale, getErrorMessage } from '../../i18n/core';
import { auditDomains, exportAuditLogs, getAuditLogs, type AuditFilters, type AuditLogEntry } from '../../lib/admin-audit';
import { storesApi, type Store, type PageResponse } from '../../lib/api';
import { PageIntro } from '../Dashboard';
import { useLocaleTools } from '../../i18n/hooks';
import './audit.css';

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
  const { number } = useLocaleTools();
  const { user, isAdmin } = useAuth();
  const [form] = Form.useForm<FilterValues>();
  const [query, setQuery] = useState<AuditFilters & { page: number; size: number }>({ page: 0, size: 20 });
  const [data, setData] = useState<PageResponse<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState<{ message: string; tooLarge: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeError, setStoreError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    setExpandedId(null);
    setError('');
    setExportError(null);
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
    setExportError(null);
    try {
      const { page: _page, size: _size, ...filters } = query;
      const blob = await exportAuditLogs(filters, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'clucky-nhat-ky-quan-tri.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted) {
        const response = (failure as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
        setExportError({
          message: getErrorMessage(failure, getBrowserLocale()),
          tooLarge: response?.status === 413 || response?.data?.code === 'REQUEST_TOO_LARGE',
        });
      }
    } finally {
      if (exportController.current === controller) {
        exportController.current = null;
        setExporting(false);
      }
    }
  };

  const renderValues = (values: Record<string, unknown>) => <Descriptions size="small" column={1} items={Object.entries(values).map(([key, value]) => ({
    key,
    label: t(`admin:audit.fields.${key}`, { defaultValue: key }),
    children: value == null ? '—' : typeof value === 'boolean' ? t(value ? 'admin:audit.yes' : 'admin:audit.no')
      : typeof value === 'number' ? number(value) : typeof value === 'object' ? JSON.stringify(value) : String(value),
  }))} />;

  const renderDetails = (entry: AuditLogEntry) => {
    const { before, after, ...detail } = entry.detail ?? {};
    return <div className="audit-details" id={`audit-detail-${entry.eventId}`}>
      <div className="audit-details-heading"><Typography.Text strong>{t('admin:audit.eventDetails')}</Typography.Text><Tag>{entry.action}</Tag></div>
      {Object.keys(detail).length > 0 && renderValues(detail)}
      <div className="audit-change-grid">
        {([['before', before], ['after', after]] as const).map(([phase, values]) => values && typeof values === 'object' && !Array.isArray(values) ? <section key={phase} className={`audit-change audit-change-${phase}`}>
          <h4>{t(`admin:audit.${phase}`)}</h4>
          {Object.keys(values).length ? renderValues(values as Record<string, unknown>) : <Typography.Text type="secondary">{t('admin:audit.noDetails')}</Typography.Text>}
        </section> : null)}
      </div>
      {!Object.keys(entry.detail ?? {}).length && <Typography.Paragraph type="secondary">{t('admin:audit.noDetails')}</Typography.Paragraph>}
      <details className="audit-technical">
        <summary>{t('admin:audit.technical')}</summary>
        <Descriptions size="small" column={1} items={[
          { key: 'event', label: 'Event ID', children: <Typography.Text copyable>{entry.eventId}</Typography.Text> },
          { key: 'correlation', label: 'Correlation ID', children: <Typography.Text copyable>{entry.correlationId}</Typography.Text> },
          { key: 'received', label: t('admin:ui.recordedAtVietnam'), children: formatTime(entry.createdAt) },
          { key: 'service', label: t('admin:ui.domain'), children: entry.sourceService },
        ]} />
        <pre>{JSON.stringify(entry.detail, null, 2)}</pre>
      </details>
    </div>;
  };

  const columns: TableColumnsType<AuditLogEntry> = [
    { title: t('admin:ui.timeVietnam'), dataIndex: 'occurredAt', width: 205, render: (value: string, entry) => <div className="audit-time"><DownOutlined aria-hidden className={expandedId === entry.eventId ? 'audit-chevron is-open' : 'audit-chevron'} /><span>{formatTime(value)}</span></div> },
    { title: t('accounts:action'), dataIndex: 'action', width: 235, render: (value: string, entry) => <div className="audit-action"><Typography.Text strong>{value}</Typography.Text><Typography.Text type="secondary">{auditDomains.find(domain => domain.value === entry.sourceService)?.label ?? entry.sourceService}</Typography.Text></div> },
    { title: t('admin:ui.actingAccount'), width: 180, render: (_, entry) => <div className="audit-action"><Typography.Text strong>#{entry.actorId}</Typography.Text><Tag>{t(`admin:audit.roles.${entry.actorRole}`, { defaultValue: entry.actorRole })}</Tag></div> },
    { title: t('business:stores.store'), width: 200, dataIndex: 'storeId', render: (value: number | null) => value == null ? <Typography.Text type="secondary">{t('admin:ui.allBranchesNoBranchAssigned')}</Typography.Text> : stores.find(store => store.id === value)?.name ?? `#${value}` },
    { title: t('admin:ui.target'), width: 180, render: (_, entry) => <div className="audit-action"><Typography.Text>{entry.targetType}</Typography.Text><Typography.Text type="secondary">#{entry.targetId}</Typography.Text></div> },
  ];

  if (!isAdmin) return <Result status="403" title={t("business:users.notPermitted")} subTitle={t("admin:ui.onlyAdminCanAccessSystemWideAuditLogs")} />;

  return (
    <div className="audit-page">
      <PageIntro eyebrow={t("admin:ui.systemAdministrator")} title={t("admin:ui.activityLog")}
        description={t("admin:ui.historyRecordedByAuditServiceASharedAccount")}
        action={<Space wrap>
          <Button icon={<ReloadOutlined />} disabled={loading} onClick={() => setRefresh(value => value + 1)}>{t('admin:audit.refresh')}</Button>
          <Button icon={<DownloadOutlined />} loading={exporting} disabled={loading || !data || exporting} onClick={download}>{t("admin:audit.exportExcel")}</Button>
        </Space>} />
      <Card className="audit-filters" title={<Space><FilterOutlined />{t('admin:audit.filters')}</Space>}>
        <Form form={form} layout="vertical" onFinish={applyFilters}>
          <div className="audit-filter-grid">
            <Form.Item name="sourceService" label={t("admin:ui.domain")}>
              <Select allowClear placeholder={t("admin:ui.allDomains")} options={auditDomains.map(domain => ({ ...domain }))} />
            </Form.Item>
            <Form.Item name="actorId" label={t("admin:ui.accountId")} rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER, message: t("admin:ui.enterAPositiveIntegerId") }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} />
            </Form.Item>
            <Form.Item name="storeId" label={t("business:stores.store")}>
              <Select allowClear showSearch optionFilterProp="label" placeholder={t("business:dashboard.scopeChain")}
                options={stores.map(store => ({ value: store.id, label: store.name }))} />
            </Form.Item>
            <Form.Item name="dates" className="audit-filter-dates" label={t("admin:ui.dateRangeVietnam")}>
              <DatePicker.RangePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="action" label={t("admin:ui.actionCode")} rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: t("admin:ui.invalidActionCode") }]}>
              <Input allowClear placeholder={t("admin:ui.exampleCustomerLocked")} maxLength={100} />
            </Form.Item>
            <Form.Item name="targetType" label={t("admin:ui.targetType")} rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: t("admin:ui.invalidTargetType") }]}>
              <Input allowClear placeholder={t("admin:ui.exampleOrderCustomer")} maxLength={100} />
            </Form.Item>
            <Form.Item name="targetId" label={t("admin:ui.targetId")} rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} />
            </Form.Item>
          </div>
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
      {exportError && <Alert type="error" showIcon message={exportError.message}
        description={exportError.tooLarge ? t("admin:ui.narrowYourFiltersIfTheExportLimitIs") : undefined} style={{ marginBottom: 16 }} />}
      <Card className="audit-results" title={t('admin:audit.results')} extra={<Typography.Text type="secondary">{data ? t('admin:ui.records', { value1: data.totalElements }) : '—'}</Typography.Text>}>
      <p className="audit-row-hint">{t('admin:audit.rowHint')}</p>
      <Table<AuditLogEntry> rowKey="eventId" columns={columns} dataSource={data?.content ?? []} loading={loading}
        rowClassName={entry => expandedId === entry.eventId ? 'audit-row audit-row-open' : 'audit-row'}
        onRow={entry => ({
          tabIndex: 0,
          'aria-expanded': expandedId === entry.eventId,
          'aria-controls': expandedId === entry.eventId ? `audit-detail-${entry.eventId}` : undefined,
          'aria-label': t('admin:audit.rowLabel', { action: entry.action, time: formatTime(entry.occurredAt) }),
          onKeyDown: event => {
            if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            setExpandedId(current => current === entry.eventId ? null : entry.eventId);
          },
        })}
        scroll={{ x: 1000 }} locale={{ emptyText: error ? t("admin:ui.unableToLoadAuditLogs") : t("admin:ui.noLogsMatchYourFilters") }}
        pagination={{ current: query.page + 1, pageSize: query.size, total: data?.totalElements ?? 0,
          showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200], showTotal: (total) => t("admin:ui.records", { value1: total }),
          onChange: (page, size) => setQuery((current) => ({ ...current, page: size === current.size ? page - 1 : 0, size })),
        }}
        expandable={{
          expandRowByClick: true,
          showExpandColumn: false,
          expandedRowKeys: expandedId ? [expandedId] : [],
          onExpand: (expanded, entry) => setExpandedId(expanded ? entry.eventId : null),
          expandedRowRender: renderDetails,
        }} />
      </Card>
    </div>
  );
}
