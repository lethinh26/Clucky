import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageIntro } from '../Dashboard';
import { useAuth } from '../../context/AuthContext';
import {
  MOCK_BANK_CONFIG,
  MOCK_BANK_TRANSACTIONS,
  MOCK_PAYMENTS,
  MOCK_WEBHOOK_LOGS,
} from '../../mocks/paymentData';
import {
  BankAccountConfig,
  BankTransaction,
  Payment,
  PaymentStatus,
  WebhookLog,
} from '../../types/payment';

const { Text } = Typography;

const STATUS_TAG: Record<PaymentStatus, { color: string; label: string }> = {
  UNPAID: { color: 'default', label: 'Chưa thanh toán' },
  PENDING: { color: 'orange', label: 'Chờ thanh toán' },
  PAID: { color: 'green', label: 'Đã thanh toán' },
  EXPIRED: { color: 'default', label: 'Hết hạn' },
  MISMATCH: { color: 'red', label: 'Sai lệch' },
  COLLECTED: { color: 'cyan', label: 'Đã thu COD' },
  REFUND_PENDING: { color: 'blue', label: 'Chờ hoàn tiền' },
  REFUNDED: { color: 'purple', label: 'Đã hoàn tiền' },
};

const formatVnd = (v: number) => `${v.toLocaleString('vi-VN')}đ`;

export const PaymentsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const managerStoreId = user.role === 'STORE_MANAGER' ? user.storeId : undefined;

  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [transactions] = useState<BankTransaction[]>(MOCK_BANK_TRANSACTIONS);
  const [webhookLogs] = useState<WebhookLog[]>(MOCK_WEBHOOK_LOGS);
  const [bankConfigs, setBankConfigs] = useState<BankAccountConfig[]>(MOCK_BANK_CONFIG);

  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [storeFilter, setStoreFilter] = useState<number | 'ALL'>(managerStoreId ?? 'ALL');
  const [logDrawer, setLogDrawer] = useState<WebhookLog | null>(null);
  const [txDrawer, setTxDrawer] = useState<BankTransaction | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [editingAcc, setEditingAcc] = useState<BankAccountConfig | null>(null);
  const [accForm] = Form.useForm<BankAccountConfig>();

  const scopedPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          (managerStoreId == null || p.storeId === managerStoreId) &&
          (storeFilter === 'ALL' || p.storeId === storeFilter) &&
          (statusFilter === 'ALL' || p.status === statusFilter)
      ),
    [payments, managerStoreId, storeFilter, statusFilter]
  );

  const scopedTx = useMemo(
    () =>
      transactions.filter(
        (t) => managerStoreId == null || t.storeId == null || t.storeId === managerStoreId
      ),
    [transactions, managerStoreId]
  );

  const handleManualConfirm = () => {
    if (!confirmTarget || !confirmReason.trim()) return;
    setPayments((prev) =>
      prev.map((p) => (p.id === confirmTarget.id ? { ...p, status: 'PAID' } : p))
    );
    message.success(`Đã xác nhận thủ công ${confirmTarget.orderCode} (audit: ${confirmReason})`);
    setConfirmTarget(null);
    setConfirmReason('');
  };

  const paymentCols: TableColumnsType<Payment> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: 'Chi nhánh', dataIndex: 'storeName', key: 'storeName' },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      key: 'method',
      render: (m: Payment['method']) =>
        m === 'BANK_TRANSFER' ? <Tag color="blue">Chuyển khoản</Tag> : <Tag color="orange">COD</Tag>,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v: number) => <Text strong style={{ color: '#8F1216' }}>{formatVnd(v)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: PaymentStatus) => <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].label}</Tag>,
    },
    { title: 'Tạo lúc', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, p) =>
        (p.status === 'PENDING' || p.status === 'MISMATCH') && p.method === 'BANK_TRANSFER' ? (
          <Button
            size="small"
            type="link"
            icon={<SafetyCertificateOutlined />}
            onClick={() => setConfirmTarget(p)}
          >
            Xác nhận thủ công
          </Button>
        ) : null,
    },
  ];

  const txCols: TableColumnsType<BankTransaction> = [
    { title: 'Mã giao dịch NH', dataIndex: 'bankTxId', key: 'bankTxId' },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v: number) => formatVnd(v),
    },
    { title: 'Nội dung', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: 'Đơn khớp',
      dataIndex: 'matchedOrderCode',
      key: 'matchedOrderCode',
      render: (v?: string) => (v ? <Tag color="green">{v}</Tag> : <Tag>Không khớp</Tag>),
    },
    { title: 'Nhận lúc', dataIndex: 'receivedAt', key: 'receivedAt' },
    {
      title: '',
      key: 'view',
      render: (_, t) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setTxDrawer(t)}>
          Payload
        </Button>
      ),
    },
  ];

  const logCols: TableColumnsType<WebhookLog> = [
    {
      title: 'Nguồn',
      dataIndex: 'provider',
      key: 'provider',
      render: (p: WebhookLog['provider']) => <Tag color={p === 'SEPAY' ? 'geekblue' : 'volcano'}>{p}</Tag>,
    },
    {
      title: 'Chữ ký',
      dataIndex: 'signatureValid',
      key: 'signatureValid',
      render: (ok: boolean) =>
        ok ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Hợp lệ</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">Sai</Tag>
        ),
    },
    {
      title: 'Đã xử lý',
      dataIndex: 'processed',
      key: 'processed',
      render: (ok: boolean) => (ok ? <Tag color="green">Đã xử lý</Tag> : <Tag color="red">Chưa xử lý</Tag>),
    },
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '',
      key: 'view',
      render: (_, l) => (
        <Button size="small" icon={<CodeOutlined />} onClick={() => setLogDrawer(l)}>
          Payload
        </Button>
      ),
    },
  ];

  const bankCols: TableColumnsType<BankAccountConfig> = [
    { title: 'Ngân hàng', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Số tài khoản', dataIndex: 'accountNo', key: 'accountNo' },
    { title: 'Chủ tài khoản', dataIndex: 'accountName', key: 'accountName' },
    {
      title: 'Đang dùng',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean, row) => (
        <Switch
          checked={v}
          disabled={!isAdmin}
          onChange={(checked) => {
            setBankConfigs((prev) => prev.map((a) => ({ ...a, isActive: a.id === row.id ? checked : false })));
            message.success(checked ? `Đã kích hoạt ${row.bankName}` : 'Đã tắt tài khoản');
          }}
        />
      ),
    },
    {
      title: '',
      key: 'edit',
      render: (_, row) =>
        isAdmin ? (
          <Button
            size="small"
            onClick={() => {
              setEditingAcc(row);
              accForm.setFieldsValue(row);
            }}
          >
            Sửa
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="payments-page">
      <PageIntro
        eyebrow="Payment & Shipping"
        title="Thanh toán & Đối soát"
        description="Giao dịch thanh toán, giao dịch ngân hàng nhận qua webhook SePay/Casso, cấu hình tài khoản nhận tiền và xác nhận thủ công."
      />

      <Card style={{ borderRadius: 20, background: '#FFFAF3', border: '1px solid #E8E2D9' }}>
        <Tabs
          defaultActiveKey="payments"
          items={[
            {
              key: 'payments',
              label: 'Giao dịch thanh toán',
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Select
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 200 }}
                      options={[
                        { value: 'ALL', label: 'Tất cả trạng thái' },
                        ...Object.entries(STATUS_TAG).map(([v, c]) => ({ value: v, label: c.label })),
                      ]}
                    />
                    <Select
                      value={storeFilter}
                      onChange={setStoreFilter}
                      disabled={managerStoreId != null}
                      style={{ width: 220 }}
                      options={[
                        { value: 'ALL', label: 'Tất cả chi nhánh' },
                        { value: 1, label: 'Nguyễn Trãi (Q.5)' },
                        { value: 2, label: 'Phan Văn Trị (Gò Vấp)' },
                        { value: 3, label: 'Lê Văn Việt (TP. Thủ Đức)' },
                      ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => message.info('Đã làm mới dữ liệu mock')}>
                      Làm mới
                    </Button>
                  </Space>
                  <Table
                    rowKey="id"
                    columns={paymentCols}
                    dataSource={scopedPayments}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                </>
              ),
            },
            {
              key: 'transactions',
              label: 'Giao dịch ngân hàng',
              children: (
                <Table
                  rowKey="id"
                  columns={txCols}
                  dataSource={scopedTx}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 900 }}
                />
              ),
            },
            {
              key: 'webhooks',
              label: 'Webhook log',
              children: (
                <Table
                  rowKey="id"
                  columns={logCols}
                  dataSource={webhookLogs}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 700 }}
                />
              ),
            },
            {
              key: 'bank-config',
              label: 'Tài khoản nhận tiền',
              children: (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    {!isAdmin ? (
                      <Text type="secondary">Chỉ Admin mới được chỉnh sửa cấu hình tài khoản.</Text>
                    ) : (
                      <span />
                    )}
                    {isAdmin && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingAcc({
                            id: '',
                            bankName: '',
                            accountNo: '',
                            accountName: '',
                            isActive: false,
                          });
                          accForm.resetFields();
                        }}
                      >
                        Thêm tài khoản
                      </Button>
                    )}
                  </div>
                  <Table
                    rowKey="id"
                    columns={bankCols}
                    dataSource={bankConfigs}
                    pagination={false}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* Manual confirm modal — bắt buộc lý do, ghi audit */}
      <Modal
        title={`Xác nhận thanh toán thủ công — ${confirmTarget?.orderCode ?? ''}`}
        open={!!confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onOk={handleManualConfirm}
        okText="Xác nhận đã nhận tiền"
        okButtonProps={{ disabled: !confirmReason.trim(), danger: false }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text>
            Số tiền cần đối chiếu:{' '}
            <Text strong style={{ color: '#8F1216' }}>
              {confirmTarget ? formatVnd(confirmTarget.amount) : ''}
            </Text>
          </Text>
          <Input.TextArea
            rows={3}
            required
            placeholder="Lý do xác nhận thủ công (bắt buộc, ghi vào audit log) — ví dụ: đã kiểm sao kê MB 12:30 26/10"
            value={confirmReason}
            onChange={(e) => setConfirmReason(e.target.value)}
          />
        </Space>
      </Modal>

      {/* Raw payload drawers */}
      <Drawer
        title={`Webhook ${logDrawer?.provider ?? ''} — ${logDrawer?.createdAt ?? ''}`}
        open={!!logDrawer}
        onClose={() => setLogDrawer(null)}
        width={480}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
          {logDrawer ? JSON.stringify(JSON.parse(logDrawer.payload), null, 2) : ''}
        </pre>
      </Drawer>
      <Drawer
        title={`Giao dịch ${txDrawer?.bankTxId ?? ''}`}
        open={!!txDrawer}
        onClose={() => setTxDrawer(null)}
        width={480}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
          {txDrawer ? JSON.stringify(JSON.parse(txDrawer.rawPayload), null, 2) : ''}
        </pre>
      </Drawer>

      {/* Edit bank account */}
      <Modal
        title={editingAcc?.id ? 'Sửa tài khoản nhận tiền' : 'Thêm tài khoản nhận tiền'}
        open={!!editingAcc}
        onCancel={() => setEditingAcc(null)}
        onOk={() => {
          accForm.validateFields().then((values) => {
            if (editingAcc?.id) {
              setBankConfigs((prev) =>
                prev.map((a) => (a.id === editingAcc.id ? { ...a, ...values } : a))
              );
            } else {
              setBankConfigs((prev) => [
                ...prev,
                {
                  ...(values as Omit<BankAccountConfig, 'id' | 'isActive'>),
                  id: `ACC-${Date.now()}`,
                  isActive: prev.length === 0,
                },
              ]);
            }
            setEditingAcc(null);
            message.success(editingAcc?.id ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản');
          });
        }}
      >
        <Form form={accForm} layout="vertical">
          <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="accountNo" label="Số tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="accountName" label="Chủ tài khoản" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
