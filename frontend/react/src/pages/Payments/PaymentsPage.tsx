import React, { useMemo, useState } from "react";
import {
  Button,
  Alert,
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
} from "antd";
import type { TableColumnsType } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { PageIntro } from "../Dashboard";
import { useAuth } from "../../context/AuthContext";
import "./payments.css";
import {
  MOCK_BANK_CONFIG,
  MOCK_BANK_TRANSACTIONS,
  MOCK_PAYMENTS,
  MOCK_WEBHOOK_LOGS,
} from "../../mocks/paymentData";
import {
  BankAccountConfig,
  BankTransaction,
  Payment,
  PaymentStatus,
  WebhookLog,
} from "../../types/payment";

const { Text } = Typography;

const STATUS_TAG: Record<PaymentStatus, { color: string; label: string }> = {
  UNPAID: { color: "default", label: "Chưa thanh toán" },
  PENDING: { color: "orange", label: "Chờ thanh toán" },
  PAID: { color: "green", label: "Đã thanh toán" },
  EXPIRED: { color: "default", label: "Hết hạn" },
  MISMATCH: { color: "red", label: "Sai lệch" },
  COLLECTED: { color: "cyan", label: "Đã thu COD" },
  REFUND_PENDING: { color: "blue", label: "Chờ hoàn tiền" },
  REFUNDED: { color: "purple", label: "Đã hoàn tiền" },
};

const formatVnd = (v: number) => `${v.toLocaleString("vi-VN")}đ`;

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <PaymentsContent key={`${user.id}-${user.role}-${user.storeId ?? "all"}`} />
  );
};

const PaymentsContent: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const managerStoreId =
    user.role === "STORE_MANAGER" ? user.storeId : undefined;

  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [transactions] = useState<BankTransaction[]>(MOCK_BANK_TRANSACTIONS);
  const [webhookLogs] = useState<WebhookLog[]>(MOCK_WEBHOOK_LOGS);
  const [bankConfigs, setBankConfigs] =
    useState<BankAccountConfig[]>(MOCK_BANK_CONFIG);

  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>(
    "ALL",
  );
  const [storeFilter, setStoreFilter] = useState<number | "ALL">(
    managerStoreId ?? "ALL",
  );
  const [logDrawer, setLogDrawer] = useState<WebhookLog | null>(null);
  const [txDrawer, setTxDrawer] = useState<BankTransaction | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [editingAcc, setEditingAcc] = useState<BankAccountConfig | null>(null);
  const [accForm] = Form.useForm<BankAccountConfig>();
  const [audit, setAudit] = useState<
    { orderCode: string; reason: string; actor: string; time: string }[]
  >([]);
  const canViewStore = (storeId?: number) =>
    isAdmin || (managerStoreId != null && storeId === managerStoreId);

  const scopedPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          (isAdmin ||
            (managerStoreId != null && p.storeId === managerStoreId)) &&
          (storeFilter === "ALL" || p.storeId === storeFilter) &&
          (statusFilter === "ALL" || p.status === statusFilter),
      ),
    [payments, isAdmin, managerStoreId, storeFilter, statusFilter],
  );

  const scopedTx = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (isAdmin ||
            (managerStoreId != null && t.storeId === managerStoreId)) &&
          (storeFilter === "ALL" || t.storeId === storeFilter),
      ),
    [transactions, isAdmin, managerStoreId, storeFilter],
  );

  const handleManualConfirm = () => {
    if (
      !confirmTarget ||
      !confirmReason.trim() ||
      !canViewStore(confirmTarget.storeId)
    )
      return;
    setPayments((prev) =>
      prev.map((p) =>
        p.id === confirmTarget.id ? { ...p, status: "PAID" } : p,
      ),
    );
    setAudit((prev) => [
      {
        orderCode: confirmTarget.orderCode,
        reason: confirmReason.trim(),
        actor: `${user.fullName} (${user.role}, chi nhánh ${confirmTarget.storeId})`,
        time: new Date().toLocaleString("vi-VN"),
      },
      ...prev,
    ]);
    message.success(`Đã xác nhận ${confirmTarget.orderCode} trong phiên demo`);
    setConfirmTarget(null);
    setConfirmReason("");
  };

  const paymentCols: TableColumnsType<Payment> = [
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: "Chi nhánh", dataIndex: "storeName", key: "storeName" },
    {
      title: "Phương thức",
      dataIndex: "method",
      key: "method",
      render: (m: Payment["method"]) =>
        m === "BANK_TRANSFER" ? (
          <Tag color="blue">Chuyển khoản</Tag>
        ) : (
          <Tag color="orange">COD</Tag>
        ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v: number) => (
        <Text strong style={{ color: "#8F1216" }}>
          {formatVnd(v)}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: PaymentStatus) => (
        <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].label}</Tag>
      ),
    },
    { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, p) =>
        (p.status === "PENDING" || p.status === "MISMATCH") &&
        p.method === "BANK_TRANSFER" ? (
          <Button
            size="small"
            type="link"
            icon={<SafetyCertificateOutlined />}
            onClick={() => {
              setConfirmReason("");
              setConfirmTarget(p);
            }}
          >
            Xác nhận thủ công
          </Button>
        ) : null,
    },
  ];

  const txCols: TableColumnsType<BankTransaction> = [
    { title: "Mã giao dịch NH", dataIndex: "bankTxId", key: "bankTxId" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v: number) => formatVnd(v),
    },
    { title: "Nội dung", dataIndex: "content", key: "content", ellipsis: true },
    {
      title: "Đơn khớp",
      dataIndex: "matchedOrderCode",
      key: "matchedOrderCode",
      render: (v?: string) =>
        v ? <Tag color="green">{v}</Tag> : <Tag>Không khớp</Tag>,
    },
    { title: "Nhận lúc", dataIndex: "receivedAt", key: "receivedAt" },
    {
      title: "",
      key: "view",
      render: (_, t) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setTxDrawer(t)}
        >
          Payload
        </Button>
      ),
    },
  ];

  const logCols: TableColumnsType<WebhookLog> = [
    {
      title: "Nguồn",
      dataIndex: "provider",
      key: "provider",
      render: (p: WebhookLog["provider"]) => (
        <Tag color={p === "SEPAY" ? "geekblue" : "volcano"}>{p}</Tag>
      ),
    },
    {
      title: "Chữ ký",
      dataIndex: "signatureValid",
      key: "signatureValid",
      render: (ok: boolean) =>
        ok ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Hợp lệ
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Sai
          </Tag>
        ),
    },
    {
      title: "Đã xử lý",
      dataIndex: "processed",
      key: "processed",
      render: (ok: boolean) =>
        ok ? (
          <Tag color="green">Đã xử lý</Tag>
        ) : (
          <Tag color="red">Chưa xử lý</Tag>
        ),
    },
    { title: "Thời gian", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "",
      key: "view",
      render: (_, l) => (
        <Button
          size="small"
          icon={<CodeOutlined />}
          onClick={() => setLogDrawer(l)}
        >
          Payload
        </Button>
      ),
    },
  ];

  const bankCols: TableColumnsType<BankAccountConfig> = [
    { title: "Ngân hàng", dataIndex: "bankName", key: "bankName" },
    { title: "Số tài khoản", dataIndex: "accountNo", key: "accountNo" },
    { title: "Chủ tài khoản", dataIndex: "accountName", key: "accountName" },
    {
      title: "Đang dùng",
      dataIndex: "isActive",
      key: "isActive",
      render: (v: boolean, row) => (
        <Switch
          aria-label={`Kích hoạt tài khoản ${row.bankName} ${row.accountNo}`}
          checked={v}
          disabled={!isAdmin}
          onChange={(checked) => {
            setBankConfigs((prev) =>
              prev.map((a) => ({
                ...a,
                isActive: a.id === row.id ? checked : false,
              })),
            );
            message.success(
              checked ? `Đã kích hoạt ${row.bankName}` : "Đã tắt tài khoản",
            );
          }}
        />
      ),
    },
    {
      title: "",
      key: "edit",
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

      <Alert
        type="info"
        showIcon
        title="Dữ liệu minh họa Sprint 1"
        description="Thao tác và nhật ký chỉ lưu trong phiên UI, tải lại trang sẽ đặt lại. Chưa kết nối Payment Service; không dùng để xác nhận giao dịch thật."
        style={{ marginBottom: 16 }}
      />

      <Card
        style={{
          borderRadius: 20,
          background: "#FFFAF3",
          border: "1px solid #E8E2D9",
        }}
      >
        <Tabs
          defaultActiveKey="payments"
          items={[
            {
              key: "payments",
              label: "Giao dịch thanh toán",
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Select
                      aria-label="Lọc trạng thái thanh toán"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 200 }}
                      options={[
                        { value: "ALL", label: "Tất cả trạng thái" },
                        ...Object.entries(STATUS_TAG).map(([v, c]) => ({
                          value: v,
                          label: c.label,
                        })),
                      ]}
                    />
                    <Select
                      aria-label="Lọc chi nhánh"
                      value={storeFilter}
                      onChange={setStoreFilter}
                      disabled={managerStoreId != null}
                      style={{ width: 220 }}
                      options={[
                        { value: "ALL", label: "Tất cả chi nhánh" },
                        { value: 1, label: "Nguyễn Trãi (Q.5)" },
                        { value: 2, label: "Phan Văn Trị (Gò Vấp)" },
                        { value: 3, label: "Lê Văn Việt (TP. Thủ Đức)" },
                      ]}
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setStatusFilter("ALL");
                        setStoreFilter(managerStoreId ?? "ALL");
                      }}
                    >
                      Đặt lại bộ lọc
                    </Button>
                  </Space>
                  <Table
                    locale={{ emptyText: "Không có thanh toán phù hợp" }}
                    rowKey="id"
                    columns={paymentCols}
                    dataSource={scopedPayments}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                  {audit.length > 0 && (
                    <section
                      aria-label="Nhật ký xác nhận trong phiên demo"
                      aria-live="polite"
                    >
                      <h3>Nhật ký xác nhận (demo)</h3>
                      {audit.map((entry, index) => (
                        <p key={index}>
                          <strong>{entry.orderCode}</strong> — {entry.reason}
                          <br />
                          {entry.actor} · {entry.time}
                        </p>
                      ))}
                    </section>
                  )}
                </>
              ),
            },
            {
              key: "transactions",
              label: "Giao dịch ngân hàng",
              children: (
                <Table
                  locale={{
                    emptyText: "Không có giao dịch thuộc phạm vi đã chọn",
                  }}
                  rowKey="id"
                  columns={txCols}
                  dataSource={scopedTx}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 900 }}
                />
              ),
            },
            {
              key: "webhooks",
              label: "Webhook log",
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
              key: "bank-config",
              label: "Tài khoản nhận tiền",
              children: (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    {!isAdmin ? (
                      <Text type="secondary">
                        Chỉ Admin mới được chỉnh sửa cấu hình tài khoản.
                      </Text>
                    ) : (
                      <span />
                    )}
                    {isAdmin && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setEditingAcc({
                            id: "",
                            bankName: "",
                            accountNo: "",
                            accountName: "",
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
                    scroll={{ x: 650 }}
                  />
                </>
              ),
            },
          ].filter(
            (tab) => isAdmin || !["webhooks", "bank-config"].includes(tab.key),
          )}
        />
      </Card>

      {/* Manual confirm modal — bắt buộc lý do, ghi audit */}
      <Modal
        title={`Xác nhận thanh toán thủ công — ${confirmTarget?.orderCode ?? ""}`}
        open={!!confirmTarget}
        onCancel={() => {
          setConfirmTarget(null);
          setConfirmReason("");
        }}
        onOk={handleManualConfirm}
        okText="Xác nhận đã nhận tiền"
        okButtonProps={{ disabled: !confirmReason.trim(), danger: false }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Text>
            Số tiền cần đối chiếu:{" "}
            <Text strong style={{ color: "#8F1216" }}>
              {confirmTarget ? formatVnd(confirmTarget.amount) : ""}
            </Text>
          </Text>
          <label htmlFor="manual-confirm-reason">Lý do xác nhận thủ công</label>
          <Input.TextArea
            id="manual-confirm-reason"
            maxLength={500}
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
        title={`Webhook ${logDrawer?.provider ?? ""} — ${logDrawer?.createdAt ?? ""}`}
        open={!!logDrawer}
        onClose={() => setLogDrawer(null)}
        size="min(480px, 100vw)"
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 12,
          }}
        >
          {logDrawer ? formatPayload(logDrawer.payload) : ""}
        </pre>
      </Drawer>
      <Drawer
        title={`Giao dịch ${txDrawer?.bankTxId ?? ""}`}
        open={!!txDrawer}
        onClose={() => setTxDrawer(null)}
        size="min(480px, 100vw)"
      >
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            fontSize: 12,
          }}
        >
          {txDrawer ? formatPayload(txDrawer.rawPayload) : ""}
        </pre>
      </Drawer>

      {/* Edit bank account */}
      <Modal
        title={
          editingAcc?.id
            ? "Sửa tài khoản nhận tiền"
            : "Thêm tài khoản nhận tiền"
        }
        open={!!editingAcc}
        onCancel={() => setEditingAcc(null)}
        onOk={() => {
          if (!isAdmin) return;
          accForm
            .validateFields()
            .then((values) => {
              if (editingAcc?.id) {
                setBankConfigs((prev) =>
                  prev.map((a) =>
                    a.id === editingAcc.id ? { ...a, ...values } : a,
                  ),
                );
              } else {
                setBankConfigs((prev) => [
                  ...prev,
                  {
                    ...(values as Omit<BankAccountConfig, "id" | "isActive">),
                    id: `ACC-${Date.now()}`,
                    isActive: prev.length === 0,
                  },
                ]);
              }
              setEditingAcc(null);
              message.success(
                editingAcc?.id ? "Đã cập nhật tài khoản" : "Đã thêm tài khoản",
              );
            })
            .catch(() => undefined);
        }}
      >
        <Form form={accForm} layout="vertical">
          <Form.Item
            name="bankName"
            label="Ngân hàng"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập tên ngân hàng",
              },
            ]}
            normalize={(value: string) => value.trimStart()}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="accountNo"
            label="Số tài khoản"
            rules={[
              { required: true, message: "Nhập số tài khoản" },
              { pattern: /^\d+$/, message: "Số tài khoản chỉ gồm chữ số" },
            ]}
          >
            <Input inputMode="numeric" />
          </Form.Item>
          <Form.Item
            name="accountName"
            label="Chủ tài khoản"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập chủ tài khoản",
              },
            ]}
            normalize={(value: string) => value.trimStart()}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;

function formatPayload(payload: string) {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}
