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
  const { isAdmin } = useAuth();
  return isAdmin ? <CustomerList /> : <Alert type="error" message="Chỉ Admin được quản lý khách hàng." />;
}

function CustomerList() {
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
    <Typography.Title level={2}>Khách hàng</Typography.Title>
    <Typography.Paragraph>Tra cứu khách hàng và lịch sử đơn hàng toàn chuỗi. Thông tin liên hệ được che bớt để bảo vệ dữ liệu cá nhân.</Typography.Paragraph>
    <Card>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search aria-label="Tìm khách hàng theo tên, email hoặc số điện thoại" placeholder="Tên, email hoặc số điện thoại"
          maxLength={255} allowClear enterButton="Tìm kiếm" style={{ width: 'min(100%, 420px)' }}
          onSearch={keyword => setQuery(current => ({ ...current, keyword: keyword.trim(), page: 1 }))} />
        <Select<CustomerStatus> aria-label="Lọc trạng thái khách hàng" placeholder="Mọi trạng thái" allowClear style={{ width: 180 }}
          value={query.status} onChange={status => setQuery(current => ({ ...current, status, page: 1 }))}
          options={[{ value: 'ACTIVE', label: 'Hoạt động' }, { value: 'LOCKED', label: 'Đã khóa' }]} />
      </Space>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={refresh}>Thử lại</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminCustomer> rowKey="id" loading={loading} dataSource={result?.content ?? []} scroll={{ x: 950 }}
        locale={{ emptyText: error ? 'Chưa tải được dữ liệu.' : loading ? 'Đang tải…' : 'Không tìm thấy khách hàng.' }}
        pagination={{ current: query.page, pageSize: query.size, total: result?.totalElements ?? 0, showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100], showTotal: total => `${total} khách hàng`,
          onChange: (page, size) => setQuery(current => ({ ...current, page: size !== current.size ? 1 : page, size })) }}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: 'Khách hàng', dataIndex: 'fullName' },
          { title: 'Email (đã che)', dataIndex: 'maskedEmail', render: value => value || '—' },
          { title: 'Điện thoại (đã che)', dataIndex: 'maskedPhone', render: value => value || '—' },
          { title: 'Ngày đăng ký', dataIndex: 'createdAt', render: dateTime },
          { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => <Tag color={status === 'LOCKED' ? 'error' : 'success'}>{status === 'LOCKED' ? 'Đã khóa' : status === 'ACTIVE' ? 'Hoạt động' : status}</Tag> },
          { title: 'Thao tác', render: (_: unknown, customer: AdminCustomer) => <Space wrap>
            <Button onClick={() => setHistory(customer)}>Lịch sử mua</Button>
            <Button danger={customer.status === 'ACTIVE'} disabled={!['ACTIVE', 'LOCKED'].includes(customer.status)} onClick={() => setTarget(customer)}>
              {customer.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
            </Button>
          </Space> },
        ]} />
    </Card>
    {target && <CustomerStatusModal customer={target} onClose={() => setTarget(null)} onSaved={() => {
      setTarget(null); refresh(); void message.success('Đã cập nhật trạng thái khách hàng.');
    }} />}
    {history && <CustomerHistory key={history.id} customer={history} onClose={() => setHistory(null)} />}
  </Space>;
}

function CustomerStatusModal({ customer, onClose, onSaved }: { customer: AdminCustomer; onClose: () => void; onSaved: () => void }) {
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
  return <Modal open title={locked ? 'Xác nhận khóa khách hàng' : 'Xác nhận mở khóa khách hàng'}
    okText={locked ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} cancelText="Hủy" confirmLoading={busy}
    okButtonProps={{ danger: locked }} cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy}
    onCancel={() => { if (!busy) onClose(); }} onOk={() => form.submit()}>
    <Typography.Paragraph><strong>{customer.fullName}</strong> — ID {customer.id}</Typography.Paragraph>
    <Typography.Paragraph>{locked ? 'Mọi phiên đăng nhập của khách hàng sẽ bị thu hồi. Đơn hàng và lịch sử mua không bị xóa.' : 'Khách hàng có thể đăng nhập lại. Phiên đăng nhập đã thu hồi không được khôi phục.'}</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
    <Form form={form} layout="vertical" onFinish={save} disabled={busy}>
      <Form.Item name="reason" label="Lý do" extra="Lý do được lưu vào nhật ký kiểm toán. Không nhập mật khẩu, mã OTP hoặc thông tin thanh toán."
        rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập lý do.' },
          { min: 3, max: 500, transform: value => typeof value === 'string' ? value.trim() : value, message: 'Lý do cần từ 3 đến 500 ký tự.' }]}>
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
  return <Drawer open title={`Lịch sử mua — ${customer.fullName} (#${customer.id})`} size="large" onClose={onClose}>
    <Typography.Paragraph>Hiển thị cả đơn chưa hoàn tất hoặc đã hủy. Tổng tiền đơn không đồng nghĩa với tiền đã thu.</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision(current => current + 1)}>Thử lại</Button>} />}
    <Table<BackendOrder> rowKey="id" loading={loading} dataSource={result?.content ?? []} scroll={{ x: 650 }}
      locale={{ emptyText: error ? 'Chưa tải được lịch sử mua.' : loading ? 'Đang tải…' : 'Khách hàng chưa có đơn hàng.' }}
      pagination={{ current: pagination.page, pageSize: pagination.size, total: result?.totalElements ?? 0, showSizeChanger: true,
        pageSizeOptions: [10, 20, 50], showTotal: total => `${total} đơn hàng`,
        onChange: (page, size) => setPagination(current => ({ page: size !== current.size ? 1 : page, size })) }}
      expandable={{ expandRowByClick: true, expandedRowRender: order => <CustomerOrderDetails customerId={customer.id} orderId={order.id} /> }}
      columns={[
        { title: 'Mã đơn', dataIndex: 'orderCode' }, { title: 'Quán', dataIndex: 'storeId' },
        { title: 'Ngày đặt', dataIndex: 'createdAt', render: dateTime },
        { title: 'Trạng thái đơn', dataIndex: 'status', render: status => <StatusTag status={status} /> },
        { title: 'Thanh toán', dataIndex: 'paymentStatus', render: value => t(`admin:paymentStates.${value ?? 'UNKNOWN'}`, { defaultValue: 'Chưa xác minh thanh toán' }) },
        { title: 'Tổng tiền đơn', dataIndex: 'totalAmount', render: money },
      ]} />
  </Drawer>;
}

function CustomerOrderDetails({ customerId, orderId }: { customerId: number; orderId: number }) {
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
  if (error) return <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision(current => current + 1)}>Thử lại</Button>} />;
  if (!order) return <Spin aria-label="Đang tải chi tiết đơn hàng" />;
  return <Space direction="vertical" style={{ width: '100%' }}>
    <Descriptions size="small" column={2} items={[
      { key: 'subtotal', label: 'Tiền món', children: money(order.subtotal) },
      { key: 'discount', label: 'Giảm giá', children: money(order.discountAmount) },
      { key: 'points', label: 'Đổi điểm', children: money(order.pointsAmount) },
      { key: 'shipping', label: 'Phí giao hàng', children: money(order.shippingFee) },
      { key: 'method', label: 'Phương thức thanh toán', children: order.paymentMethod || 'Chưa có dữ liệu' },
    ]} />
    <Table rowKey="id" size="small" pagination={false} dataSource={order.items ?? []}
      locale={{ emptyText: 'Không có dữ liệu món trong đơn.' }} columns={[
        { title: 'Món', dataIndex: 'itemName' }, { title: 'Số lượng', dataIndex: 'quantity' },
        { title: 'Đơn giá', dataIndex: 'unitPrice', render: money }, { title: 'Thành tiền', dataIndex: 'lineTotal', render: money },
      ]} />
  </Space>;
}
