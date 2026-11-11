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
    { title: 'Thời gian (VN)', dataIndex: 'occurredAt', render: formatTime, width: 185 },
    { title: 'Lĩnh vực', dataIndex: 'sourceService', render: (value: string) => auditDomains.find((domain) => domain.value === value)?.label ?? value },
    { title: 'Tài khoản thao tác', render: (_, entry) => <Space wrap><Typography.Text>#{entry.actorId}</Typography.Text><Tag>{entry.actorRole}</Tag></Space> },
    { title: 'Chi nhánh', dataIndex: 'storeId', render: (value: number | null) => value == null ? 'Toàn chuỗi / không gắn quán' : stores.find(store => store.id === value)?.name ?? `#${value}` },
    { title: 'Thao tác', dataIndex: 'action' },
    { title: 'Đối tượng', render: (_, entry) => `${entry.targetType} #${entry.targetId}` },
  ];

  if (!isAdmin) return <Result status="403" title="Không có quyền" subTitle="Nhật ký toàn hệ thống chỉ dành cho Admin." />;

  return (
    <div style={{ fontFamily: 'Quicksand, sans-serif' }}>
      <PageIntro eyebrow="Admin toàn hệ thống" title="Nhật ký thao tác"
        description="Lịch sử đã ghi nhận tại Audit Service. ID tài khoản dùng chung không xác định một nhân viên cá nhân."
        action={<Space wrap>
          <Button icon={<DownloadOutlined />} loading={exporting} disabled={loading || !data || exporting} onClick={download}>Xuất CSV</Button>
        </Space>} />
      <Alert showIcon type="info" style={{ marginBottom: 16 }}
        message="Nhật ký nhận bất đồng bộ; danh sách rỗng không chứng minh chưa từng có thao tác."
        description="Lọc ngày theo giờ Việt Nam. Xuất tối đa 10.000 bản ghi khớp bộ lọc, không chỉ trang hiện tại; không xuất nội dung tự do, email hoặc thông tin thanh toán." />
      <Card style={{ marginBottom: 16, background: '#FFFAF3' }}>
        <Form form={form} layout="vertical" onFinish={applyFilters}>
          <Space wrap align="start">
            <Form.Item name="sourceService" label="Lĩnh vực">
              <Select allowClear placeholder="Tất cả lĩnh vực" options={auditDomains} style={{ width: 225 }} />
            </Form.Item>
            <Form.Item name="actorId" label="ID tài khoản" rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER, message: 'Nhập ID nguyên dương.' }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name="storeId" label="Chi nhánh">
              <Select allowClear showSearch optionFilterProp="label" placeholder="Toàn chuỗi" style={{ width: 230 }}
                options={stores.map(store => ({ value: store.id, label: store.name }))} />
            </Form.Item>
            <Form.Item name="dates" label="Khoảng ngày (VN)">
              <DatePicker.RangePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="action" label="Mã thao tác" rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: 'Mã thao tác không hợp lệ.' }]}>
              <Input allowClear placeholder="Ví dụ: CUSTOMER_LOCKED" maxLength={100} style={{ width: 230 }} />
            </Form.Item>
            <Form.Item name="targetType" label="Loại đối tượng" rules={[{ pattern: /^[A-Za-z0-9._:-]{1,100}$/, message: 'Loại đối tượng không hợp lệ.' }]}>
              <Input allowClear placeholder="Ví dụ: Order, Customer" maxLength={100} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="targetId" label="ID đối tượng" rules={[{ type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER }]}>
              <InputNumber min={1} max={Number.MAX_SAFE_INTEGER} style={{ width: 170 }} />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" htmlType="submit">Áp dụng bộ lọc</Button>
            <Button onClick={() => { form.resetFields(); setQuery({ page: 0, size: query.size }); }}>Xóa bộ lọc</Button>
          </Space>
        </Form>
      </Card>
      {storeError && <Alert type="warning" showIcon message={storeError} style={{ marginBottom: 16 }}
        action={<Button onClick={() => setRefresh(value => value + 1)}>Thử lại danh sách chi nhánh</Button>} />}
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }}
        action={<Button onClick={() => setRefresh((value) => value + 1)}>Thử lại</Button>} />}
      {exportError && <Alert type="error" showIcon message={exportError} description="Nếu vượt giới hạn xuất, hãy thu hẹp bộ lọc." style={{ marginBottom: 16 }} />}
      <Table<AuditLogEntry> rowKey="eventId" columns={columns} dataSource={data?.content ?? []} loading={loading}
        scroll={{ x: 1100 }} locale={{ emptyText: error ? 'Không tải được nhật ký.' : 'Không có nhật ký khớp bộ lọc.' }}
        pagination={{ current: query.page + 1, pageSize: query.size, total: data?.totalElements ?? 0,
          showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200], showTotal: (total) => `${total} bản ghi`,
          onChange: (page, size) => setQuery((current) => ({ ...current, page: size === current.size ? page - 1 : 0, size })),
        }}
        expandable={{ expandedRowRender: (entry) => <>
          <Descriptions size="small" column={1} items={[
            { key: 'event', label: 'Event ID', children: entry.eventId },
            { key: 'correlation', label: 'Correlation ID', children: entry.correlationId },
            { key: 'received', label: 'Ghi nhận (VN)', children: formatTime(entry.createdAt) },
          ]} />
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(entry.detail, null, 2)}</pre>
        </> }} />
    </div>
  );
}
