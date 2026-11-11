import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage } from '../../lib/api';
import { adminNotificationsApi, type EmailLog, type EmailLogFilters, type EmailStatus, type NotificationPage } from '../../lib/admin-notifications';

const statusLabels: Record<EmailStatus, string> = {
  QUEUED: 'Chờ gửi', SENDING: 'Đang gửi', SENT: 'Đã gửi', FAILED: 'Thất bại', EXPIRED: 'Hết hạn',
};

interface SearchValues { recipient?: string; status?: EmailStatus; from?: string; to?: string }
const failureLabels: Record<string, string> = {
  SMTP_CONNECT_FAILED: 'Không kết nối được SMTP; hệ thống chỉ thử lại trong giới hạn cấu hình.',
  SMTP_OUTCOME_UNKNOWN: 'Chưa xác định email đã được nhận hay chưa. Không gửi lại trước khi đối chiếu nhà cung cấp.',
  INVALID_TEMPLATE: 'Thiếu hoặc không hợp lệ mẫu email/biến nội dung.',
  DELIVERY_FAILED: 'Lỗi gửi email; không hiển thị thông tin nhạy cảm từ nhà cung cấp.',
};

export function EmailLogsPage() {
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
      form.setFields([{ name: 'to', errors: ['Ngày kết thúc phải từ ngày bắt đầu trở đi.'] }]);
      return;
    }
    const to = values.to ? new Date(new Date(`${values.to}T00:00:00+07:00`).getTime() + 86400000) : null;
    setPage(0);
    setFilters({ recipient: values.recipient?.trim() || undefined, status: values.status,
      from: values.from ? new Date(`${values.from}T00:00:00+07:00`).toISOString() : undefined,
      to: to?.toISOString() });
  }

  const columns: TableColumnsType<EmailLog> = [
    { title: 'Người nhận (đã che)', dataIndex: 'toEmail', key: 'recipient' },
    { title: 'Tiêu đề', dataIndex: 'subject', key: 'subject', render: (subject: string) => subject || 'Chưa kết xuất' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status: EmailStatus) =>
      <Tag color={status === 'SENT' ? 'success' : status === 'FAILED' ? 'error' : 'default'}>{statusLabels[status] ?? status}</Tag> },
    { title: 'Mẫu email', dataIndex: 'template', key: 'template' },
    { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => date(value, { dateStyle: 'short', timeStyle: 'short' }) },
    { title: 'Gửi lúc', dataIndex: 'sentAt', key: 'sentAt', render: (value: string | null) => value ? date(value, { dateStyle: 'short', timeStyle: 'short' }) : '—' },
  ];

  if (!isAdmin) return <Alert type="error" title="Chỉ Admin được xem nhật ký email." />;

  return <Space orientation="vertical" size="large" style={{ width: '100%' }}>
    <div>
      <Typography.Title level={2}>Nhật ký email</Typography.Title>
      <Typography.Paragraph type="secondary">Dữ liệu từ hệ thống gửi email; địa chỉ được che tại API. Không hỗ trợ gửi lại thủ công.</Typography.Paragraph>
    </div>
    <Card>
      <Form form={form} layout="inline" onFinish={search} style={{ gap: 12 }}>
        <Form.Item name="recipient" label="Người nhận"><Input maxLength={255} placeholder="Tìm địa chỉ email" allowClear autoComplete="off" /></Form.Item>
        <Form.Item name="status" label="Trạng thái"><Select allowClear placeholder="Tất cả" style={{ width: 150 }} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item name="from" label="Tạo từ ngày"><Input type="date" /></Form.Item>
        <Form.Item name="to" label="Đến hết ngày"><Input type="date" /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Tìm kiếm</Button></Form.Item>
        <Form.Item><Button onClick={() => { form.resetFields(); setFilters({}); setPage(0); }}>Xóa bộ lọc</Button></Form.Item>
      </Form>
    </Card>
    {error ? <Alert type="error" showIcon title="Không tải được nhật ký email" description={error} action={<Button onClick={() => setReload(value => value + 1)}>Thử lại</Button>} /> :
      <Table<EmailLog> rowKey="id" columns={columns} dataSource={result?.content ?? []} loading={loading} scroll={{ x: 1000 }}
        expandable={{ expandedRowRender: entry => <Descriptions column={1} size="small" items={[
          { key: 'reason', label: 'Chẩn đoán', children: entry.failureCode ? failureLabels[entry.failureCode] ?? 'Không có chẩn đoán an toàn.' : 'Không ghi nhận lỗi.' },
          { key: 'retry', label: 'Số lần gửi lỗi', children: entry.retryCount },
          { key: 'next', label: 'Lần thử tiếp theo', children: entry.nextAttemptAt ? date(entry.nextAttemptAt, { dateStyle: 'short', timeStyle: 'short' }) : 'Không có lịch gửi lại' },
          { key: 'event', label: 'Event ID', children: entry.eventId ?? '—' },
          { key: 'trace', label: 'Correlation ID', children: entry.correlationId ?? '—' },
        ]} /> }}
        locale={{ emptyText: loading ? 'Đang tải…' : 'Không có email phù hợp.' }}
        pagination={{ current: page + 1, pageSize: size, total: result?.totalElements ?? 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], onChange: (nextPage, nextSize) => { setPage(nextSize !== size ? 0 : nextPage - 1); setSize(nextSize); } }} />}
  </Space>;
}

export default EmailLogsPage;
