import i18n from "../../i18n/index.ts";
import { useEffect, useId, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import {
  BankOutlined,
  CheckCircleOutlined,
  CompressOutlined,
  CopyOutlined,
  DollarCircleOutlined,
  ExpandAltOutlined,
  QrcodeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Descriptions, Empty, Form, Input, InputNumber, Modal, Select, Space, Spin, Table, Tag } from "antd";
import { message } from "../../components/feedback";
import { getErrorMessage, paymentsApi, type BackendCounterReceipt, type Store } from "../../lib/api";
import { adminFinance, canAdopt, canCollect, collectionBody, collectionState, financeOperation, reconciliationBody, receiptSelectionIssue,
  type CollectionInput, type FinanceOperation, type PaymentSnapshot, type Receipt, type ReceiptConflict } from "../../lib/admin-finance";
import { useLocaleTools } from "../../i18n/hooks";
import { RefundsPanel } from "../Orders/RefundsPanel";
import { ReceiptPicker } from "./ReceiptPicker";
import { AdminModal } from "../../components/ui/AdminModal";
import { orderDate, orderLabels, paymentColor, paymentLabels, paymentMethodLabel } from "../Orders/presentation";
import "../Orders/admin-orders.css";

type Action = "collection" | "reconcile" | "legacy";
interface Fields extends CollectionInput { target: string; paymentId: number; acceptOriginalConflict: boolean }
const reasonRules = [{ required: true, whitespace: true, max: 500, pattern: /^[^\x00]*$/, get message() { return i18n.t("admin:ui.enterAValidReasonUpTo500Characters"); } }];
const amountRules = [{ required: true, type: "integer" as const, min: 0, max: 999999999999, get message() { return i18n.t("admin:ui.enterANonNegativeWholeVndAmountUp"); } }];

export function FinanceModal({ orderId, receiptId: initialReceiptId, stores = [], onClose, onChanged }: {
  orderId: number; receiptId?: string; stores?: Store[]; onClose: () => void; onChanged: () => void;
}) {
  const { money, locale } = useLocaleTools();
  const { t } = useTranslation('payments');
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const [counterReceipt, setCounterReceipt] = useState<BackendCounterReceipt | null>(null);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState("");
  const [operationError, setOperationError] = useState("");
  const [receiptId, setReceiptId] = useState(initialReceiptId || "");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptRevision, setReceiptRevision] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Fields | null>(null);
  const receiptRequest = useRef<AbortController | null>(null);
  const [conflictsReady, setConflictsReady] = useState(false);
  const [form] = Form.useForm<Fields>();
  const cashAmount = Form.useWatch("cashAmount", form) ?? 0;
  const transferAmount = Form.useWatch("transferAmount", form) ?? 0;
  const pending = useRef<FinanceOperation | null>(null);
  const submitting = useRef(false);
  const alive = useRef(true);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const lastState = useRef("");
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (action) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void adminFinance.snapshot(orderId, controller.signal).then(async data => {
      if (controller.signal.aborted) return;
      const state = JSON.stringify([data.order.version, data.order.paymentStatus, data.collection?.status, data.collection?.version]);
      if (lastState.current && lastState.current !== state) changed.current();
      lastState.current = state;
      setSnapshot(data);
      const posReceipt = await paymentsApi
        .getReceiptByOrderCode(data.order.orderCode, controller.signal)
        .catch(() => null);
      if (!controller.signal.aborted) {
        setCounterReceipt(posReceipt);
      }
    }).catch(failure => { if (!controller.signal.aborted) { setSnapshot(null); setCounterReceipt(null); setError(getErrorMessage(failure)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [orderId, revision, action]);

  useEffect(() => {
    if (action || loading) return;
    const timer = window.setTimeout(() => setRevision(value => value + 1), 5000);
    return () => window.clearTimeout(timer);
  }, [action, loading, revision]);

  useEffect(() => {
    setReceipt(null); setReceiptError(""); setConflictsReady(false);
    if (!receiptId) { setReceiptLoading(false); return; }
    const controller = new AbortController();
    receiptRequest.current = controller;
    setReceiptLoading(true);
    void adminFinance.receipt(receiptId, controller.signal).then(data => { if (!controller.signal.aborted) setReceipt(data); })
      .catch(failure => { if (!controller.signal.aborted) setReceiptError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setReceiptLoading(false); });
    return () => controller.abort();
  }, [receiptId, revision, receiptRevision]);

  function begin(next: Action) {
    if (!snapshot || loading) return;
    form.resetFields(); setOperationError(""); setResult(""); setAction(next);
    form.setFieldsValue({ cashAmount: snapshot?.order.amount ?? 0, transferAmount: 0, cashTendered: snapshot?.order.amount ?? 0, cashChange: 0,
      acceptOriginalConflict: false, paymentId: snapshot?.payments.find(payment => canAdopt(snapshot, payment))?.id,
      target: targets.length === 1 ? targets[0].value : undefined });
    if (next === 'reconcile' && !receiptId) setPickerOpen(true);
  }

  function selectReceipt(selected: Receipt) {
    receiptRequest.current?.abort(); setReceipt(null); setReceiptError(''); setConflictsReady(false); setReceiptLoading(true);
    form.setFieldValue('acceptOriginalConflict', false); setOperationError(''); setConfirmation(null);
    setReceiptId(selected.id); setReceiptRevision(current => current + 1); setPickerOpen(false);
  }

  async function send(values?: Fields, confirmed = false) {
    if (submitting.current || !snapshot || !action) return;
    let operation = pending.current;
    try {
      if (!uncertain && values) {
        const body = action === "collection" ? collectionBody(snapshot, values)
          : action === "reconcile" ? reconciliationBody(receipt!, snapshot, values.target, values.reason, !!values.acceptOriginalConflict)
          : { paymentId: values.paymentId, version: snapshot.payments.find(payment => payment.id === values.paymentId)!.version, reason: values.reason.trim() };
        operation = financeOperation(orderId, action, body, pending.current);
      }
      if (!operation) return;
    } catch (failure) { setOperationError(getErrorMessage(failure)); return; }
    if (action === 'reconcile' && !uncertain && !confirmed && values) { setConfirmation(values); return; }
    setConfirmation(null);
    pending.current = operation; submitting.current = true; setBusy(true); setOperationError("");
    try {
      await adminFinance.submit(operation);
      if (!alive.current) return;
      pending.current = null; setUncertain(false); setAction(null);
      setResult(action === "collection" ? t("admin:ui.theCollectionRequestHasBeenRecordedItIs")
        : action === "legacy" ? t("admin:ui.legacyPaymentDataHasBeenAdoptedIntoThe")
          : t("admin:ui.reconciliationRecordedSeeTheUpdatedOrderStatusAnd"));
      setRevision(value => value + 1); changed.current();
    } catch (failure) {
      if (!alive.current) return;
      const unknown = !isAxiosError(failure) || !failure.response || failure.response.status >= 500 || failure.response.status === 408;
      setUncertain(unknown);
      setOperationError(unknown ? t("admin:ui.theResultIsUncertainResubmitToVerifyThe")
        : t("admin:ui.dataIsSynchronizingAutomaticallyReviewTheStatusVersion", { value1: getErrorMessage(failure) }));
      if (!unknown) { pending.current = null; setAction(null); setRevision(value => value + 1); }
    } finally { submitting.current = false; if (alive.current) setBusy(false); }
  }

  const collection = snapshot?.collection;
  const state = collection ? collectionState(collection) : null;
  const targets = snapshot ? [
    ...snapshot.payments.filter(payment => payment.method === "BANK_TRANSFER" && (payment.live_payment || snapshot.order.paymentStatus !== "PENDING"
      || ["CANCELLED", "COMPLETED"].includes(snapshot.order.status))).map(payment => ({ value: `payment:${payment.id}`, label: t("admin:ui.bankTransfer", { value1: payment.id, value2: money(payment.amount), value3: paymentLabels[payment.status] ?? payment.status }) })),
    ...(collection?.status === "ACCEPTED" && collection.transfer_amount > 0 ? [{ value: "collection", label: t("admin:ui.transferDeclaredAtTheCounter", { value1: money(collection.transfer_amount) }) }] : []),
  ] : [];
  const selectionIssue = receipt && snapshot ? receiptSelectionIssue(receipt, snapshot.order) : '';

  const orderMethod = (counterReceipt?.method || snapshot?.order.paymentMethod || "").toUpperCase();
  const isPaidOrCollected =
    ["PAID", "COLLECTED"].includes((snapshot?.order.paymentStatus ?? "").toUpperCase()) ||
    counterReceipt?.status === "RECONCILED";
  const isCashOrder =
    ["CASH", "COD", "SPLIT"].includes(orderMethod) ||
    (collection?.cash_amount ?? 0) > 0 ||
    (counterReceipt?.cashAmount ?? 0) > 0;
  const isQrOrder =
    ["BANK_TRANSFER", "VIETQR", "SPLIT"].includes(orderMethod) ||
    (collection?.transfer_amount ?? 0) > 0 ||
    (counterReceipt?.bankAmountDeclared ?? 0) > 0 ||
    (snapshot?.payments.some(p => p.method === "BANK_TRANSFER") ?? false);

  const cashAmountDue = counterReceipt
    ? counterReceipt.cashAmount
    : collection && collection.cash_amount > 0
      ? collection.cash_amount
      : snapshot?.order.amount ?? 0;
  const cashCollectedActual = counterReceipt
    ? counterReceipt.cashAmount
    : collection
      ? collection.cash_amount
      : isPaidOrCollected
        ? (snapshot?.order.amount ?? 0)
        : 0;
  const cashTenderedVal = counterReceipt
    ? counterReceipt.cashTendered
    : collection && collection.cash_tendered > 0
      ? collection.cash_tendered
      : isPaidOrCollected
        ? cashCollectedActual
        : 0;
  const cashChangeVal = counterReceipt
    ? counterReceipt.cashChange
    : collection
      ? collection.cash_change
      : Math.max(0, cashTenderedVal - cashCollectedActual);
  const roundingDiffVal = counterReceipt?.roundingDifference ?? 0;

  const bankPayment =
    snapshot?.payments.find(p => p.method === "BANK_TRANSFER" && p.live_payment) ??
    snapshot?.payments.find(p => p.method === "BANK_TRANSFER");
  const qrAmountDue =
    counterReceipt && counterReceipt.bankAmountDeclared > 0
      ? counterReceipt.bankAmountDeclared
      : collection && collection.transfer_amount > 0
        ? collection.transfer_amount
        : bankPayment?.amount ?? snapshot?.order.amount ?? 0;
  const qrReconciledAmount =
    counterReceipt && counterReceipt.bankAmountReconciled > 0
      ? counterReceipt.bankAmountReconciled
      : collection && collection.bankEvidence > 0
        ? collection.bankEvidence
        : bankPayment && bankPayment.received_amount > 0
          ? bankPayment.received_amount
          : isPaidOrCollected && !isCashOrder
            ? qrAmountDue
            : 0;
  const bankCode = bankPayment?.bank_code || "MB";
  const bankName = bankPayment?.bank_name || t("business:financeModal.defaultBankName");
  const accountNo = bankPayment?.account_no || "0387654321";
  const accountName = bankPayment?.account_name || "CLUCKY FAST FOOD";
  const transferRef =
    counterReceipt?.bankRefCode ||
    bankPayment?.transfer_content ||
    snapshot?.order.orderCode ||
    "";
  const qrImageUrl = snapshot
    ? `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNo)}-compact2.png?amount=${qrAmountDue}&addInfo=${encodeURIComponent(transferRef)}&accountName=${encodeURIComponent(accountName)}`
    : "";

  const displayTransactions = snapshot
    ? [
        ...snapshot.payments.map(payment => ({
          key: `payment-${payment.id}`,
          code: `#${payment.id}`,
          subtitle: payment.transfer_content
            ? t("business:financeModal.txTransferContent", { ref: payment.transfer_content })
            : payment.live_payment
              ? t("admin:ui.current")
              : t("admin:ui.legacyData"),
          method: payment.method,
          detailText: payment.account_no
            ? `${payment.bank_code || payment.bank_name || t("business:paymentwidget.bank")} · ${payment.account_no}`
            : t("business:financeModal.txRequestedAmount", { amount: money(payment.amount) }),
          status: payment.status,
          amount:
            payment.received_amount > 0
              ? payment.received_amount
              : ["PAID", "COLLECTED"].includes(payment.status)
                ? payment.amount
                : payment.received_amount,
        })),
        ...(counterReceipt
          ? [
              {
                key: `receipt-${counterReceipt.id}`,
                code: counterReceipt.receiptCode,
                subtitle: t("business:financeModal.txCashier", {
                  staff: counterReceipt.staffName || t("business:orderdetaildrawer.counterPickup"),
                  time: orderDate(counterReceipt.createdAt, locale),
                }),
                method: counterReceipt.method,
                detailText:
                  counterReceipt.method === "CASH"
                    ? t("business:financeModal.txCashDetail", {
                        tendered: money(counterReceipt.cashTendered),
                        change: money(counterReceipt.cashChange),
                      })
                    : counterReceipt.method === "BANK_TRANSFER"
                      ? t("business:financeModal.txQrRef", {
                          ref: counterReceipt.bankRefCode || snapshot.order.orderCode,
                        })
                      : t("business:financeModal.txSplitDetail", {
                          cash: money(counterReceipt.cashAmount),
                          tendered: money(counterReceipt.cashTendered),
                          change: money(counterReceipt.cashChange),
                          qr: money(counterReceipt.bankAmountDeclared),
                        }),
                status:
                  counterReceipt.status === "RECONCILED"
                    ? "COLLECTED"
                    : counterReceipt.status === "VOIDED"
                      ? "FAILED"
                      : snapshot.order.paymentStatus,
                amount:
                  counterReceipt.cashAmount +
                  (counterReceipt.bankAmountReconciled > 0
                    ? counterReceipt.bankAmountReconciled
                    : counterReceipt.bankAmountDeclared),
              },
            ]
          : snapshot.payments.length === 0 && (collection || isPaidOrCollected)
            ? [
                {
                  key: `cod-${snapshot.order.orderId}`,
                  code: `COD-${snapshot.order.orderCode}`,
                  subtitle: collection
                    ? t("business:financeModal.txReceiptVersion", { version: collection.version })
                    : t("business:financeModal.txCodSubtitle"),
                  method: snapshot.order.paymentMethod,
                  detailText: t("business:financeModal.txCashDetail", {
                    tendered: money(cashTenderedVal),
                    change: money(cashChangeVal),
                  }),
                  status: snapshot.order.paymentStatus,
                  amount: cashCollectedActual,
                },
              ]
            : []),
      ]
    : [];

  return <Modal open centered className="admin-finance-modal" footer={null} width={900} zIndex={1100}
    title={<div className="order-drawer-title"><div><small>{t("admin:ui.financeRefunds429")}</small>
    <strong>{snapshot?.order.orderCode ?? t("business:reviews.orderNumber", { value1: orderId })}</strong></div></div>} onCancel={() => { if (!submitting.current && !uncertain) onClose(); }}
    closable={!busy && !uncertain} maskClosable={!busy && !uncertain} keyboard={!busy && !uncertain}>
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {loading && !snapshot && <Spin aria-label={t("admin:ui.synchronizingFinancialData")} />}
      {error && <Alert type="error" showIcon message={error} />}
      {result && <Alert type="info" showIcon message={result} />}
      {operationError && <Alert type="error" showIcon message={operationError} />}
      {snapshot && <>
        <section className="order-section">
        <div className="finance-summary"><div><small>{t("admin:ui.orderAmountDue")}</small><strong>{money(snapshot.order.amount)}</strong></div>
          <Space wrap><Tag>{orderLabels[snapshot.order.status] ?? snapshot.order.status}</Tag><Tag color={paymentColor(snapshot.order.paymentStatus)}>{paymentLabels[snapshot.order.paymentStatus] ?? snapshot.order.paymentStatus}</Tag></Space></div>
        <Descriptions column={{ xs: 1, sm: 2 }} layout="vertical" size="small" colon={false} items={[
          { key: "store", label: t("business:party.store"), children: stores.find(store => store.id === snapshot.order.storeId)?.name ?? t("business:reviews.storeNumber", { value1: snapshot.order.storeId }) },
          { key: "method", label: t("admin:ui.orderPaymentMethod"), children: paymentMethodLabel(counterReceipt?.method || snapshot.order.paymentMethod) },
          ...(snapshot.order.expiresAt ? [{ key: "expiry", label: t("admin:ui.paymentDeadlineVietnamTime"), children: orderDate(snapshot.order.expiresAt, locale) }] : []),
        ]} />
        </section>

        {isCashOrder && (
          <section className="order-section finance-method-card">
            <div className="order-section-heading">
              <h3>
                <DollarCircleOutlined /> {t("business:financeModal.cashCodSectionTitle")}
              </h3>
              <Tag color={isPaidOrCollected ? "green" : "gold"}>
                {isPaidOrCollected
                  ? t("business:financeModal.cashCollectedBadge")
                  : t("business:financeModal.cashPendingBadge")}
              </Tag>
            </div>
            <div className="finance-cod-grid">
              <div className="finance-cod-stat">
                <span>{t("business:financeModal.amountDue")}</span>
                <strong>{money(cashAmountDue)}</strong>
              </div>
              <div className="finance-cod-stat">
                <span>{t("business:financeModal.cashCollectedActual")}</span>
                <strong className={isPaidOrCollected ? "finance-stat-positive" : ""}>
                  {money(cashCollectedActual)}
                </strong>
              </div>
              <div className="finance-cod-stat">
                <span>{t("business:financeModal.cashTendered")}</span>
                <strong>{money(cashTenderedVal)}</strong>
              </div>
              <div className="finance-cod-stat finance-cod-stat-highlight">
                <span>{t("business:financeModal.cashChange")}</span>
                <strong>{money(cashChangeVal)}</strong>
              </div>
            </div>
            <Descriptions
              column={{ xs: 1, sm: 3 }}
              size="small"
              style={{ marginTop: 14 }}
              items={[
                {
                  key: "receiptCode",
                  label: t("business:financeModal.receiptCodeLabel"),
                  children:
                    counterReceipt?.receiptCode ||
                    (isPaidOrCollected ? `COD-${snapshot.order.orderCode}` : t("business:financeModal.notIssuedYet")),
                },
                {
                  key: "staff",
                  label: t("business:financeModal.staffConfirmLabel"),
                  children:
                    counterReceipt?.staffName ||
                    (isPaidOrCollected
                      ? t("business:financeModal.defaultStaffConfirm")
                      : t("business:financeModal.notRecordedYet")),
                },
                {
                  key: "rounding",
                  label: t("business:financeModal.roundingDiffLabel"),
                  children: money(roundingDiffVal),
                },
                ...(counterReceipt?.createdAt
                  ? [
                      {
                        key: "collectedAt",
                        label: t("business:financeModal.collectedAtLabel"),
                        children: orderDate(counterReceipt.createdAt, locale),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        )}

        {isQrOrder && (
          <section className="order-section finance-method-card">
            <div className="order-section-heading">
              <h3>
                <QrcodeOutlined /> {t("business:financeModal.qrSectionTitle")}
              </h3>
              <Space wrap>
                <Tag color={qrReconciledAmount >= qrAmountDue && qrAmountDue > 0 ? "green" : "gold"}>
                  {qrReconciledAmount >= qrAmountDue && qrAmountDue > 0
                    ? t("business:financeModal.qrReconciledBadge")
                    : t("business:financeModal.qrPendingBadge")}
                </Tag>
                <Button
                  size="small"
                  type={qrExpanded ? "primary" : "default"}
                  icon={qrExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
                  onClick={() => setQrExpanded(prev => !prev)}
                >
                  {qrExpanded
                    ? t("business:financeModal.collapseQrBtn")
                    : t("business:financeModal.expandQrBtn")}
                </Button>
              </Space>
            </div>
            <div className="finance-qr-summary-bar">
              <div className="finance-qr-preview-left">
                <img
                  src={qrImageUrl}
                  alt={`VietQR ${snapshot.order.orderCode}`}
                  className="finance-qr-thumb"
                  onClick={() => setQrExpanded(true)}
                />
                <div className="finance-qr-meta">
                  <div className="finance-qr-amount-row">
                    <span>{t("business:financeModal.qrAmountDueLabel")}</span>
                    <strong>{money(qrAmountDue)}</strong>
                  </div>
                  <div className="finance-qr-sub-row">
                    <span>{t("business:financeModal.bankReceivedLabel")}</span>
                    <strong className={qrReconciledAmount > 0 ? "finance-stat-positive" : ""}>
                      {money(qrReconciledAmount)}
                    </strong>
                  </div>
                  <div className="finance-qr-bank-line">
                    <BankOutlined /> {bankName} · {t("business:financeModal.accountNoShort")} <strong>{accountNo}</strong> ({accountName})
                  </div>
                  <div className="finance-qr-ref-line">
                    <span>{t("business:financeModal.transferContentCodeLabel")}</span>
                    <code>{transferRef}</code>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        void navigator.clipboard?.writeText(transferRef);
                        message.success(t("business:financeModal.copiedTransferRef", { ref: transferRef }));
                      }}
                    >
                      {t("business:financeModal.copyBtn")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {qrExpanded && (
              <div className="finance-qr-expanded-box">
                <div className="finance-qr-expanded-card">
                  <div className="finance-qr-expanded-badge">
                    <CheckCircleOutlined /> {t("business:financeModal.expandedBadge")}
                  </div>
                  <img
                    src={qrImageUrl}
                    alt={`VietQR Expanded ${snapshot.order.orderCode}`}
                    className="finance-qr-expanded-img"
                  />
                  <div className="finance-qr-expanded-details">
                    <div>
                      <span>{t("business:financeModal.amountToCollect")}</span>
                      <strong className="finance-qr-big-amount">{money(qrAmountDue)}</strong>
                    </div>
                    <div>
                      <span>{t("business:financeModal.transferReferenceLabel")}</span>
                      <strong className="finance-qr-big-ref">{transferRef}</strong>
                    </div>
                    <div>
                      <span>{t("business:financeModal.beneficiaryAccount")}</span>
                      <strong>
                        {bankCode} - {accountNo} ({accountName})
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {collection && <>
          <Alert showIcon type={state === "RECONCILED" ? "success" : "warning"}
            message={state === "PENDING" ? t("admin:ui.awaitingCollectionConfirmation") : state === "ACCEPTED" ? t("admin:ui.collectionAcceptedDiscrepancyOrEvidenceStillPending")
              : state === "RECONCILED" ? t("admin:ui.amountAndBankEvidenceMatched") : t("admin:ui.collectionRejected", { value1: state })}
            description={t("admin:ui.aDeclaredTransferIsNotBankEvidenceAn")} />
          <section className="order-section"><div className="order-section-heading"><h3>{t("admin:ui.collectionDetails")}</h3></div><Descriptions column={{ xs: 1, sm: 2 }} size="small" items={[
            { key: "cash", label: t("admin:ui.cash"), children: money(collection.cash_amount) },
            { key: "declared", label: t("admin:ui.declaredBankTransfer"), children: money(collection.transfer_amount) },
            { key: "bank", label: t("admin:ui.bankVerifiedAmount"), children: money(collection.bankEvidence) },
            { key: "pending", label: t("admin:ui.awaitingEvidence"), children: money(collection.pendingTransfer) },
            { key: "difference", label: t("admin:ui.declaredCollectionAmountDue"), children: money(collection.discrepancy) },
            { key: "excess", label: t("admin:ui.bankOverpayment"), children: money(collection.bankExcess) },
            { key: "tendered", label: t("admin:ui.cashTenderedChange"), children: `${money(collection.cash_tendered)} / ${money(collection.cash_change)}` },
          ]} /></section>
        </>}
        <section className="order-section"><div className="order-section-heading"><h3>{t("business:paymentspage.paymentTransactions")}</h3><Tag>{displayTransactions.length} {t("admin:ui.transactions")}</Tag></div>
        <Table rowKey="key" size="small" pagination={false} dataSource={displayTransactions} scroll={{ x: 640 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noPaymentTransactionsYet")} /> }} columns={[
          { title: t("payments:transactionsTab"), width: 170, render: (_, item) => <div className="order-cell"><strong>{item.code}</strong><small>{item.subtitle}</small></div> },
          { title: t("business:orderdetaildrawer.method"), width: 230, render: (_, item) => <div className="order-cell"><span>{paymentMethodLabel(item.method)}</span><small>{item.detailText}</small></div> },
          { title: t("accounts:status"), width: 130, dataIndex: "status", render: status => <Tag color={paymentColor(status)}>{paymentLabels[status] ?? status}</Tag> },
          { title: t("business:financeModal.collectedReceivedCol"), align: 'right', dataIndex: "amount", render: money },
        ]} />
        {!action && <div className="finance-actions">
          {canCollect(snapshot) && <Button type="primary" disabled={loading} onClick={() => begin("collection")}>{t("admin:ui.recordCollection")}</Button>}
          {targets.length > 0 && <Button disabled={loading} onClick={() => begin("reconcile")}>{t("admin:ui.reconcileBankReceipt")}</Button>}
          {snapshot.payments.some(payment => canAdopt(snapshot, payment)) && <Button disabled={loading} onClick={() => begin("legacy")}>{t("admin:ui.adoptLegacyPayment")}</Button>}
        </div>}
        </section>
        {action && <Form className="order-section finance-form" name={`finance-${orderId}`} form={form} layout="vertical" disabled={busy || uncertain} onFinish={values => void send(values)}>
          <div className="order-section-heading"><h3>{action === "collection" ? t("admin:ui.recordCollection") : action === "legacy" ? t("admin:ui.adoptLegacyPayment") : t("admin:ui.reconcileBankReceipt")}</h3></div>
          {action === "collection" && <><div className="order-form-grid">
            {([['cashAmount', t("admin:ui.cashCollected")], ['transferAmount', t("admin:ui.declaredBankTransfer")], ['cashTendered', t("payments:cashTendered")], ['cashChange', t("admin:ui.cashChangeReturned")]] as const).map(([name, label]) =>
              <Form.Item key={name} name={name} label={`${label} (VND)`} rules={amountRules}><InputNumber min={0} max={999999999999} step={1} style={{ width: "100%" }} /></Form.Item>)}
            </div>
            <Alert type="info" message={t("admin:ui.declaredDiscrepancy", { value1: money(cashAmount + transferAmount - snapshot.order.amount) })}
              description={t("admin:ui.cashTenderedMinusCashCollectedMustEqualChange")} />
          </>}
          {action === "legacy" && <>
            <Alert type="warning" showIcon message={t("admin:ui.onlyUnexpiredLegacyBankRecordsMatchingTheOrder")} />
            <Form.Item name="paymentId" label={t("admin:ui.legacyPayment")} rules={[{ required: true }]}><Select options={snapshot.payments.filter(payment => canAdopt(snapshot, payment)).map(payment => ({ value: payment.id, label: `#${payment.id} · v${payment.version}` }))} /></Form.Item>
          </>}
          {action === "reconcile" && <>
            <div className="receipt-selection-heading"><div><strong>{t("admin:ui.1BankTransaction")}</strong><p>{t("admin:ui.chooseAnActualTransactionAlreadyReceivedByThe")}</p></div>
              <Button icon={<SearchOutlined />} onClick={() => setPickerOpen(true)}>{receipt ? t("admin:ui.changeTransaction") : t("admin:ui.selectTransaction")}</Button></div>
            {receiptLoading && <Spin aria-label={t("admin:ui.fetchingTheLatestTransactionDetails")} />}
            {receiptError && <Alert type="error" message={receiptError} />}
            {receipt && <>
              <section className="receipt-selected-card">
                <div className="receipt-selected-top"><span><BankOutlined /> {receipt.bank || t("admin:ui.unknownBank")} · {receipt.maskedAccount || t("admin:ui.noAccountAvailable")}</span>
                  <strong>{money(receipt.amount)}</strong></div>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" layout="vertical" items={[
                  { key: 'transaction', label: t("admin:ui.bankTransactionId"), children: receipt.transactionId },
                  { key: 'time', label: receipt.bankOccurredAt ? t("admin:ui.bankTransactionTime") : t("admin:ui.receivedAt"), children: orderDate(receipt.bankOccurredAt || receipt.receivedAt, locale) },
                  { key: 'content', label: t("payments:transferContent"), children: receipt.content || t("admin:ui.noDescription"), span: 2 },
                  { key: 'state', label: t("payments:receiptStatus"), children: t(`receiptStatuses.${receipt.status}`, { defaultValue: receipt.status }) },
                  { key: 'linked', label: receipt.matchedOrderCode ? t("admin:ui.allocatedToOrder") : t("admin:ui.referencedOrder"), children: receipt.matchedOrderCode || receipt.candidateOrderCode || t("admin:ui.unknown") },
                ]} />
                {receipt.reason && <p className="receipt-search-hint">{t(`receiptReasons.${receipt.reason}`, { defaultValue: receipt.reason })}</p>}
                <p className="receipt-comparison">{receipt.amount === snapshot.order.amount ? t("admin:ui.theAmountEqualsTheOrderTotal")
                  : t("admin:ui.theAmountIsTheOrderTotalBy", { value1: receipt.amount > snapshot.order.amount ? t("admin:ui.higherThan") : t("admin:ui.lowerThan"), value2: money(Math.abs(receipt.amount - snapshot.order.amount)) })} {t("admin:ui.thisComparesAgainstTheOrderTotalNotThe")}</p>
              </section>
              {selectionIssue && <Alert type="error" showIcon message={t("admin:ui.thisTransactionCannotBeUsedYet")} description={selectionIssue} />}
              {receipt.conflictCount > 0 && <>
                <Alert type="warning" showIcon message={t("admin:ui.thereAreRecordedConflictsCompareTheOriginalAnd", { value1: receipt.conflictCount })} />
                <ReceiptConflictList key={`${receipt.id}-${receipt.version}`} receiptId={receipt.id} disabled={busy || uncertain} onReady={setConflictsReady} />
                <Form.Item name="acceptOriginalConflict" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error(t("admin:ui.confirmRetainingTheOriginalRecord"))) }]}>
                  <Checkbox>{t("admin:ui.iHaveReviewedTheVariantsAndAcceptThe")}</Checkbox>
                </Form.Item>
              </>}
            </>}
            <Form.Item name="target" label={t("admin:ui.2TransferToReconcile")} rules={[{ required: true, message: t("admin:ui.selectTheTransferToReconcile") }]}
              extra={targets.length === 1 ? t("admin:ui.theOnlyEligibleTransferForThisOrderHas") : t("admin:ui.selectAnOrderPaymentOrATransferDeclared")}>
              <Select options={targets} placeholder={t("admin:ui.selectTransfer")} /></Form.Item>
            <Alert type="info" showIcon message={t("admin:ui.theBankReceivingAccountAndBranchMustMatch")}
              description={t("admin:ui.matchingAmountsAloneDoNotConfirmATransaction")} />
          </>}
          <Form.Item name="reason" label={action === 'reconcile' ? t("admin:ui.3BasisForConfirmingTheTransaction") : t("admin:ui.reasonSupportingEvidence")} rules={reasonRules}>
            <Input.TextArea maxLength={500} showCount rows={3} placeholder={action === 'reconcile' ? t("admin:ui.describeWhatYouVerifiedTransferDescriptionCustomerConfirmation") : undefined} /></Form.Item>
          {!uncertain && <Space><Button type="primary" htmlType="submit" loading={busy}
            disabled={loading || action === "reconcile" && (!receipt || receiptLoading || !!selectionIssue || receipt.conflictCount > 0 && !conflictsReady)}>{action === 'reconcile' ? t("admin:ui.reviewConfirm") : t("admin:ui.submitRequest")}</Button>
            <Button onClick={() => { setAction(null); setRevision(value => value + 1); }}>{t("admin:ui.cancelAction")}</Button></Space>}
        </Form>}
        {uncertain && <Button type="primary" loading={busy} onClick={() => void send()}>{t("admin:ui.resubmitToVerifyTheResult")}</Button>}
        {!action && <section className="order-section"><RefundsPanel orderId={orderId} revision={revision} onChanged={onChanged} /></section>}
      </>}
    </Space>
    {pickerOpen && snapshot && <ReceiptPicker snapshot={snapshot} selectedId={receiptId} onSelect={selectReceipt} onClose={() => setPickerOpen(false)} />}
    <AdminModal className="admin-order-modal" centered width={560} open={confirmation !== null} title={t("admin:ui.confirmTransactionReconciliation")} subtitle={snapshot?.order.orderCode}
      okText={t("admin:ui.confirmReconciliation")} cancelText={t("admin:ui.reviewAgain")} confirmLoading={busy} onCancel={() => setConfirmation(null)}
      okButtonProps={{ disabled: !receipt || receiptLoading || !!selectionIssue }} onOk={() => { if (confirmation) void send(confirmation, true); }}>
      {receipt && snapshot && <><Descriptions column={1} size="small" items={[
        { key: 'bank', label: t("business:paymentspage.bankTransactions"), children: `${receipt.transactionId} · ${receipt.bank || t("admin:ui.unknownBank")} · ${receipt.maskedAccount}` },
        { key: 'amount', label: t("admin:ui.transactionAmount"), children: <strong className="order-amount">{money(receipt.amount)}</strong> },
        { key: 'order', label: t("business:promotionUi.order"), children: snapshot.order.orderCode },
        { key: 'target', label: t("admin:ui.reconciliationTarget"), children: targets.find(target => target.value === confirmation?.target)?.label },
        { key: 'reason', label: t("payments:log.evidence"), children: confirmation?.reason },
      ]} />
        <Alert type="warning" showIcon message={t("admin:ui.confirmOnlyAfterVerifyingTheCorrectTransactionAnd")}
          description={t("admin:ui.theSystemRechecksDataAndVersionsBeforeRecording")} /></>}
    </AdminModal>
  </Modal>;
}

export function ReceiptConflictList({ receiptId, disabled = false, onReady }: { receiptId: string; disabled?: boolean; onReady?: (ready: boolean) => void }) {
  const { t } = useTranslation();
  const { money } = useLocaleTools();
  const [page, setPage] = useState(0);
  const [conflicts, setConflicts] = useState<ReceiptConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setConflicts([]); setError(""); onReady?.(false);
    void adminFinance.conflicts(receiptId, page, controller.signal).then(data => {
      if (!controller.signal.aborted) { setConflicts(data); onReady?.(true); }
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [receiptId, page, revision, onReady]);
  useEffect(() => {
    if (!error || disabled) return;
    const timer = window.setTimeout(() => setRevision(value => value + 1), 15000);
    return () => window.clearTimeout(timer);
  }, [error, disabled, revision]);
  return <Space direction="vertical" style={{ width: "100%" }}>
    {error && <Alert type="error" message={error} />}
    <Table<ReceiptConflict> size="small" loading={loading} pagination={false} dataSource={conflicts} rowKey={entry => JSON.stringify(entry)} scroll={{ x: 750 }} columns={[
      { title: t("admin:ui.variantAmount"), dataIndex: "amount", render: money }, { title: t("business:paymentwidget.bank"), dataIndex: "bank" },
      { title: t("accounts:account"), dataIndex: "maskedAccount" }, { title: t("business:paymentwidget.description"), dataIndex: "content" },
      { title: t("admin:ui.direction"), dataIndex: "direction" }, { title: t("admin:ui.bankTime"), dataIndex: "bankTime" },
      { title: t("admin:ui.sameAccountSubAccount"), render: (_, entry) => `${entry.sameAccount ? t("accounts:yes") : t("accounts:no")} / ${entry.subAccount ? t("accounts:yes") : t("accounts:no")}` },
      { title: t("admin:ui.lastOccurrence"), dataIndex: "lastSeenAt" }, { title: t("admin:ui.occurrences"), dataIndex: "occurrences" },
    ]} />
    <Space><Button disabled={disabled || loading || page === 0} onClick={() => { onReady?.(false); setPage(value => value - 1); }}>{t("admin:ui.previousPage")}</Button>
      <span>Trang {page + 1}</span><Button disabled={disabled || loading || conflicts.length < 20} onClick={() => { onReady?.(false); setPage(value => value + 1); }}>Trang sau</Button></Space>
  </Space>;
}

export function FinanceLookup({ receiptId, initialCode, onChanged }: { receiptId?: string; initialCode?: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const formName = useId();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRef<AbortController | null>(null);
  useEffect(() => () => lookup.current?.abort(), []);
  async function find(values: { orderCode: string }) {
    lookup.current?.abort();
    const controller = new AbortController(); lookup.current = controller;
    setLoading(true); setError("");
    try {
      const code = values.orderCode.trim();
      const order = await adminFinance.orderByCode(code, controller.signal);
      if (controller.signal.aborted) return;
      setOrderId(order.id);
    } catch (failure) { if (!controller.signal.aborted) setError(getErrorMessage(failure)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <>
    <Form name={formName} layout="vertical" initialValues={{ orderCode: initialCode }} onFinish={values => void find(values)}>
      <Form.Item name="orderCode" label={t("admin:ui.orderIdForCollectionReconciliationLegacyAdoption")} rules={[{ required: true, whitespace: true, max: 80 }]}>
        <Input maxLength={80} onChange={() => { lookup.current?.abort(); setLoading(false); setError(""); }} />
      </Form.Item>
      <Button htmlType="submit" loading={loading}>{t("admin:ui.openOrderFinances")}</Button>
    </Form>
    {error && <Alert type="error" message={error} />}
    {orderId !== null && <FinanceModal key={`${orderId}-${receiptId || ''}`} orderId={orderId} receiptId={receiptId} onClose={() => setOrderId(null)} onChanged={onChanged} />}
  </>;
}
