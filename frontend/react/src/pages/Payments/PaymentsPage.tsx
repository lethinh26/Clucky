import { message } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import { useTranslation } from "react-i18next";
import React, { useMemo, useState } from "react";
import { Button, Alert, Card, Drawer, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Typography } from "antd";
import { TableColumnsType } from "antd";
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





export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  return <PaymentsContent key={`${user.id}-${user.role}-${user.storeId ?? "all"}`} />;
};

const PaymentsContent: React.FC = () => {
  const { t } = useTranslation();
  const { money: formatVnd, date } = useLocaleTools();
  const STATUS_TAG: Record<PaymentStatus, { color: string; label: string }> = {
    UNPAID: {color: "default", label: t("business:paymentstatusbadge.unpaid")},
    PENDING: {color: "orange", label: t("business:checkout.awaitingPayment")},
    PAID: {color: "green", label: t("business:demoordercontrols.paid")},
    EXPIRED: {color: "default", label: t("business:paymentstatusbadge.expired")},
    MISMATCH: {color: "red", label: t("business:paymentspage.mismatch")},
    COLLECTED: {color: "cyan", label: t("business:paymentstatusbadge.codCollected")},
    REFUND_PENDING: {color: "blue", label: t("business:paymentstatusbadge.refundPending")},
    REFUNDED: {color: "purple", label: t("business:paymentstatusbadge.refunded")},
  };
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
        actor: t("business:paymentspage.store", { value1: user.fullName, value2: user.role, value3: confirmTarget.storeId }),
        time: new Date().toISOString(),
      },
      ...prev,
    ]);
    message.success(t("business:paymentspage.confirmedInTheDemoSession", { value1: confirmTarget.orderCode }));
    setConfirmTarget(null);
    setConfirmReason("");
  };

  const paymentCols: TableColumnsType<Payment> = [
    {
      title: t("business:dashboard.orderCode"),
      dataIndex: "orderCode",
      key: "orderCode",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: t("business:party.store"), dataIndex: "storeName", key: "storeName" },
    {
      title: t("business:orderdetaildrawer.method"),
      dataIndex: "method",
      key: "method",
      render: (m: Payment["method"]) =>
        m === "BANK_TRANSFER" ? (
          <Tag color="blue">{t("business:id.bankTransfer")}</Tag>
        ) : (
          <Tag color="orange">COD</Tag>
        ),
    },
    {
      title: t("business:paymentspage.amount"),
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
      title: t("business:catalog.status"),
      dataIndex: "status",
      key: "status",
      render: (s: PaymentStatus) => (
        <Tag color={STATUS_TAG[s].color}>{STATUS_TAG[s].label}</Tag>
      ),
    },
    { title: t("business:paymentspage.createdAt"), dataIndex: "createdAt", key: "createdAt" },
    {
      title: t("business:catalog.actions"),
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
          > {t("business:paymentspage.manualConfirmation")} </Button>
        ) : null,
    },
  ];

  const txCols: TableColumnsType<BankTransaction> = [
    { title: t("business:paymentspage.bankTransactionCode"), dataIndex: "bankTxId", key: "bankTxId" },
    {
      title: t("business:paymentspage.amount"),
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v: number) => formatVnd(v),
    },
    { title: t("business:paymentwidget.description"), dataIndex: "content", key: "content", ellipsis: true },
    {
      title: t("business:paymentspage.matchedOrder"),
      dataIndex: "matchedOrderCode",
      key: "matchedOrderCode",
      render: (v?: string) =>
        v ? <Tag color="green">{v}</Tag> : <Tag>{t("business:paymentspage.unmatched")}</Tag>,
    },
    { title: t("business:paymentspage.receivedAt"), dataIndex: "receivedAt", key: "receivedAt" },
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
      title: t("business:paymentspage.source"),
      dataIndex: "provider",
      key: "provider",
      render: (p: WebhookLog["provider"]) => (
        <Tag color={p === "SEPAY" ? "geekblue" : "volcano"}>{p}</Tag>
      ),
    },
    {
      title: t("business:paymentspage.signature"),
      dataIndex: "signatureValid",
      key: "signatureValid",
      render: (ok: boolean) =>
        ok ? (
          <Tag icon={<CheckCircleOutlined />} color="success"> {t("business:paymentspage.valid")} </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Sai
          </Tag>
        ),
    },
    {
      title: t("business:paymentspage.processed"),
      dataIndex: "processed",
      key: "processed",
      render: (ok: boolean) =>
        ok ? (
          <Tag color="green">{t("business:paymentspage.processed")}</Tag>
        ) : (
          <Tag color="red">{t("business:paymentspage.unprocessed")}</Tag>
        ),
    },
    { title: t("business:party.time"), dataIndex: "createdAt", key: "createdAt" },
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
    { title: t("business:paymentwidget.bank"), dataIndex: "bankName", key: "bankName" },
    { title: t("business:paymentwidget.accountNumber"), dataIndex: "accountNo", key: "accountNo" },
    { title: t("business:paymentwidget.accountHolder"), dataIndex: "accountName", key: "accountName" },
    {
      title: t("business:paymentspage.inUse"),
      dataIndex: "isActive",
      key: "isActive",
      render: (v: boolean, row) => (
        <Switch
          aria-label={t("business:paymentspage.activateAccount", { value1: row.bankName, value2: row.accountNo })}
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
              checked ? t("business:paymentspage.activated", { value1: row.bankName }) : t("business:paymentspage.accountDeactivated"),
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
          > {t("business:account.edit")} </Button>
        ) : null,
    },
  ];

  return (
    <div className="payments-page">
      <PageIntro
        eyebrow="Payment & Shipping"
        title={t("business:paymentspage.paymentsReconciliation")}
        description={t("business:paymentspage.paymentTransactionsBankTransactionsReceivedThroughSepayCassoWebhooksReceivingAccountConfiguration")}
      />

      <Alert
        type="info"
        showIcon
        title={t("business:paymentspage.sprintSampleData")}
        description={t("business:paymentspage.actionsAndLogsOnlyLastForThisUiSessionAndResetOn")}
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
              label: t("business:paymentspage.paymentTransactions"),
              children: (
                <>
                  <Space wrap style={{ marginBottom: 16 }}>
                    <Select
                      aria-label={t("business:paymentspage.filterPaymentStatus")}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: 200 }}
                      options={[
                        { value: "ALL", label: t("business:paymentspage.allStatuses") },
                        ...Object.entries(STATUS_TAG).map(([v, c]) => ({
                          value: v,
                          label: c.label,
                        })),
                      ]}
                    />
                    <Select
                      aria-label={t("business:orderspage.filterStores")}
                      value={storeFilter}
                      onChange={setStoreFilter}
                      disabled={managerStoreId != null}
                      style={{ width: 220 }}
                      options={[
                        { value: "ALL", label: t("business:stores.allStores") },
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
                    > {t("business:paymentspage.resetFilters")} </Button>
                  </Space>
                  <Table
                    locale={{ emptyText: t("business:paymentspage.noMatchingPayments") }}
                    rowKey="id"
                    columns={paymentCols}
                    dataSource={scopedPayments}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                  />
                  {audit.length > 0 && (
                    <section
                      aria-label={t("business:paymentspage.confirmationLogForThisDemoSession")}
                      aria-live="polite"
                    >
                      <h3>{t("business:paymentspage.confirmationLogDemo")}</h3>
                      {audit.map((entry, index) => (
                        <p key={index}>
                          <strong>{entry.orderCode}</strong> — {entry.reason}
                          <br />
                          {entry.actor} · {date(entry.time, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ))}
                    </section>
                  )}
                </>
              ),
            },
            {
              key: "transactions",
              label: t("business:paymentspage.bankTransactions"),
              children: (
                <Table
                  locale={{
                    emptyText: t("business:paymentspage.noTransactionsInTheSelectedScope"),
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
              label: t("business:paymentspage.receivingAccounts"),
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
                      <Text type="secondary"> {t("business:paymentspage.onlyAdminCanEditAccountConfiguration")} </Text>
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
                      > {t("business:paymentspage.addAccount")} </Button>
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
        title={t("business:paymentspage.manualPaymentConfirmation", { value1: confirmTarget?.orderCode ?? "" })}
        open={!!confirmTarget}
        onCancel={() => {
          setConfirmTarget(null);
          setConfirmReason("");
        }}
        onOk={handleManualConfirm}
        okText={t("business:paymentspage.confirmPaymentReceived")}
        okButtonProps={{ disabled: !confirmReason.trim(), danger: false }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Text> {t("business:paymentspage.amountToReconcile")}{" "}
            <Text strong style={{ color: "#8F1216" }}>
              {confirmTarget ? formatVnd(confirmTarget.amount) : ""}
            </Text>
          </Text>
          <label htmlFor="manual-confirm-reason">{t("business:paymentspage.reasonForManualConfirmation")}</label>
          <Input.TextArea
            id="manual-confirm-reason"
            maxLength={500}
            rows={3}
            required
            placeholder={t("business:paymentspage.reasonForManualConfirmationRequiredRecordedInTheAuditLogEG")}
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
        title={t("business:paymentspage.transaction", { value1: txDrawer?.bankTxId ?? "" })}
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
            ? t("business:paymentspage.editReceivingAccount")
            : t("business:paymentspage.addReceivingAccount")
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
                editingAcc?.id ? t("business:paymentspage.accountUpdated") : t("business:paymentspage.accountAdded"),
              );
            })
            .catch(() => undefined);
        }}
      >
        <Form form={accForm} layout="vertical">
          <Form.Item
            name="bankName"
            label={t("business:paymentwidget.bank")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("business:paymentspage.enterBankName"),
              },
            ]}
            normalize={(value: string) => value.trimStart()}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="accountNo"
            label={t("business:paymentwidget.accountNumber")}
            rules={[
              { required: true, message: t("business:paymentspage.enterAccountNumber") },
              { pattern: /^\d+$/, message: t("business:paymentspage.theAccountNumberMustContainDigitsOnly") },
            ]}
          >
            <Input inputMode="numeric" />
          </Form.Item>
          <Form.Item
            name="accountName"
            label={t("business:paymentwidget.accountHolder")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("business:paymentspage.enterAccountHolder"),
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
