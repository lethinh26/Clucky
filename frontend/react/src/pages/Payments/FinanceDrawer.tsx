import { useEffect, useId, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { BankOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Descriptions, Empty, Form, Input, InputNumber, Modal, Select, Space, Spin, Table, Tag } from "antd";
import { getErrorMessage, type Store } from "../../lib/api";
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
const reasonRules = [{ required: true, whitespace: true, max: 500, pattern: /^[^\x00]*$/, message: "Nhập lý do hợp lệ (tối đa 500 ký tự)." }];
const amountRules = [{ required: true, type: "integer" as const, min: 0, max: 999999999999, message: "Nhập số tiền VND nguyên, không âm, tối đa 12 chữ số." }];

export function FinanceModal({ orderId, receiptId: initialReceiptId, stores = [], onClose, onChanged }: {
  orderId: number; receiptId?: string; stores?: Store[]; onClose: () => void; onChanged: () => void;
}) {
  const { money, locale } = useLocaleTools();
  const { t } = useTranslation('payments');
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
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
    void adminFinance.snapshot(orderId, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      const state = JSON.stringify([data.order.version, data.order.paymentStatus, data.collection?.status, data.collection?.version]);
      if (lastState.current && lastState.current !== state) changed.current();
      lastState.current = state;
      setSnapshot(data);
    }).catch(failure => { if (!controller.signal.aborted) { setSnapshot(null); setError(getErrorMessage(failure)); } })
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
      setResult(action === "collection" ? "Đã ghi nhận yêu cầu thu tiền. Yêu cầu đang chờ xử lý, chưa xác nhận đã thu thành công."
        : action === "legacy" ? "Đã tiếp nhận dữ liệu thanh toán cũ vào quy trình hiện tại; chưa xác nhận đã nhận đủ tiền."
          : "Đã ghi nhận đối soát. Xem trạng thái đơn và bằng chứng ngân hàng cập nhật bên dưới.");
      setRevision(value => value + 1); changed.current();
    } catch (failure) {
      if (!alive.current) return;
      const unknown = !isAxiosError(failure) || !failure.response || failure.response.status >= 500 || failure.response.status === 408;
      setUncertain(unknown);
      setOperationError(unknown ? "Chưa xác định được kết quả. Gửi lại yêu cầu để xác minh; hệ thống giữ nguyên mã xử lý, không tạo giao dịch mới."
        : `${getErrorMessage(failure)} Dữ liệu đang tự đồng bộ; kiểm tra lại trạng thái, phiên bản và bằng chứng trước khi mở thao tác mới.`);
      if (!unknown) { pending.current = null; setAction(null); setRevision(value => value + 1); }
    } finally { submitting.current = false; if (alive.current) setBusy(false); }
  }

  const collection = snapshot?.collection;
  const state = collection ? collectionState(collection) : null;
  const targets = snapshot ? [
    ...snapshot.payments.filter(payment => payment.method === "BANK_TRANSFER" && (payment.live_payment || snapshot.order.paymentStatus !== "PENDING"
      || ["CANCELLED", "COMPLETED"].includes(snapshot.order.status))).map(payment => ({ value: `payment:${payment.id}`, label: `Chuyển khoản #${payment.id} · ${money(payment.amount)} · ${paymentLabels[payment.status] ?? payment.status}` })),
    ...(collection?.status === "ACCEPTED" && collection.transfer_amount > 0 ? [{ value: "collection", label: `Chuyển khoản đã khai tại quầy · ${money(collection.transfer_amount)}` }] : []),
  ] : [];
  const selectionIssue = receipt && snapshot ? receiptSelectionIssue(receipt, snapshot.order) : '';

  return <Modal open centered className="admin-finance-modal" footer={null} width={900} zIndex={1100}
    title={<div className="order-drawer-title"><div><small>TÀI CHÍNH & HOÀN TIỀN</small>
    <strong>{snapshot?.order.orderCode ?? `Đơn #${orderId}`}</strong></div></div>} onCancel={() => { if (!submitting.current && !uncertain) onClose(); }}
    closable={!busy && !uncertain} maskClosable={!busy && !uncertain} keyboard={!busy && !uncertain}>
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {loading && !snapshot && <Spin aria-label="Đang đồng bộ tài chính" />}
      {error && <Alert type="error" showIcon message={error} />}
      {result && <Alert type="info" showIcon message={result} />}
      {operationError && <Alert type="error" showIcon message={operationError} />}
      {snapshot && <>
        <section className="order-section">
        <div className="finance-summary"><div><small>Tổng thanh toán của đơn</small><strong>{money(snapshot.order.amount)}</strong></div>
          <Space wrap><Tag>{orderLabels[snapshot.order.status] ?? snapshot.order.status}</Tag><Tag color={paymentColor(snapshot.order.paymentStatus)}>{paymentLabels[snapshot.order.paymentStatus] ?? snapshot.order.paymentStatus}</Tag></Space></div>
        <Descriptions column={{ xs: 1, sm: 2 }} layout="vertical" size="small" colon={false} items={[
          { key: "store", label: "Chi nhánh", children: stores.find(store => store.id === snapshot.order.storeId)?.name ?? `Chi nhánh #${snapshot.order.storeId}` },
          { key: "method", label: "Phương thức đặt hàng", children: paymentMethodLabel(snapshot.order.paymentMethod) },
          ...(snapshot.order.expiresAt ? [{ key: "expiry", label: "Hạn thanh toán (giờ Việt Nam)", children: orderDate(snapshot.order.expiresAt, locale) }] : []),
        ]} />
        </section>
        {collection && <>
          <Alert showIcon type={state === "RECONCILED" ? "success" : "warning"}
            message={state === "PENDING" ? "Đang chờ xác nhận khoản thu" : state === "ACCEPTED" ? "Đã chấp nhận khoản thu · còn chênh lệch hoặc chờ bằng chứng"
              : state === "RECONCILED" ? "Đã khớp số tiền và bằng chứng ngân hàng" : `Khoản thu không được chấp nhận: ${state}`}
            description="Khai chuyển khoản không phải bằng chứng ngân hàng; chấp nhận khoản thu không đồng nghĩa đơn đã hoàn thành." />
          <section className="order-section"><div className="order-section-heading"><h3>Chi tiết khoản thu</h3></div><Descriptions column={{ xs: 1, sm: 2 }} size="small" items={[
            { key: "cash", label: "Tiền mặt", children: money(collection.cash_amount) },
            { key: "declared", label: "Chuyển khoản khai báo", children: money(collection.transfer_amount) },
            { key: "bank", label: "Ngân hàng đã xác minh", children: money(collection.bankEvidence) },
            { key: "pending", label: "Chờ bằng chứng", children: money(collection.pendingTransfer) },
            { key: "difference", label: "Chênh lệch khai thu − phải thu", children: money(collection.discrepancy) },
            { key: "excess", label: "Ngân hàng nhận dư", children: money(collection.bankExcess) },
            { key: "tendered", label: "Khách đưa / trả lại", children: `${money(collection.cash_tendered)} / ${money(collection.cash_change)}` },
          ]} /></section>
        </>}
        <section className="order-section"><div className="order-section-heading"><h3>Giao dịch thanh toán</h3><Tag>{snapshot.payments.length} giao dịch</Tag></div>
        <Table rowKey="id" size="small" pagination={false} dataSource={snapshot.payments} scroll={{ x: 580 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giao dịch thanh toán" /> }} columns={[
          { title: "Giao dịch", width: 100, render: (_, payment) => <div className="order-cell"><strong>#{payment.id}</strong><small>{payment.live_payment ? 'Hiện hành' : 'Dữ liệu cũ'}</small></div> },
          { title: "Phương thức", width: 180, dataIndex: "method", render: paymentMethodLabel },
          { title: "Trạng thái", width: 130, dataIndex: "status", render: status => <Tag color={paymentColor(status)}>{paymentLabels[status] ?? status}</Tag> },
          { title: "Ngân hàng đã nhận", align: 'right', dataIndex: "received_amount", render: money },
        ]} />
        {!action && <div className="finance-actions">
          {canCollect(snapshot) && <Button type="primary" disabled={loading} onClick={() => begin("collection")}>Ghi nhận thu tiền</Button>}
          {targets.length > 0 && <Button disabled={loading} onClick={() => begin("reconcile")}>Đối soát biên nhận</Button>}
          {snapshot.payments.some(payment => canAdopt(snapshot, payment)) && <Button disabled={loading} onClick={() => begin("legacy")}>Tiếp nhận thanh toán cũ</Button>}
        </div>}
        </section>
        {action && <Form className="order-section finance-form" name={`finance-${orderId}`} form={form} layout="vertical" disabled={busy || uncertain} onFinish={values => void send(values)}>
          <div className="order-section-heading"><h3>{action === "collection" ? "Ghi nhận thu tiền" : action === "legacy" ? "Tiếp nhận thanh toán cũ" : "Đối soát biên nhận"}</h3></div>
          {action === "collection" && <><div className="order-form-grid">
            {([['cashAmount', 'Tiền mặt thực thu'], ['transferAmount', 'Chuyển khoản khai báo'], ['cashTendered', 'Tiền mặt khách đưa'], ['cashChange', 'Tiền mặt trả lại']] as const).map(([name, label]) =>
              <Form.Item key={name} name={name} label={`${label} (VND)`} rules={amountRules}><InputNumber min={0} max={999999999999} step={1} style={{ width: "100%" }} /></Form.Item>)}
            </div>
            <Alert type="info" message={`Chênh lệch khai báo: ${money(cashAmount + transferAmount - snapshot.order.amount)}`}
              description="Khách đưa − tiền mặt thực thu phải bằng tiền trả lại. Khoản khai thiếu/dư được lưu để đối soát, không tự hoàn tiền dư." />
          </>}
          {action === "legacy" && <>
            <Alert type="warning" showIcon message="Chỉ tiếp nhận bản ghi ngân hàng legacy còn hạn, khớp đơn và có đủ snapshot ngân hàng. Backend xác minh lại; không sửa snapshot hay ghi nhận thanh toán thủ công." />
            <Form.Item name="paymentId" label="Thanh toán legacy" rules={[{ required: true }]}><Select options={snapshot.payments.filter(payment => canAdopt(snapshot, payment)).map(payment => ({ value: payment.id, label: `#${payment.id} · v${payment.version}` }))} /></Form.Item>
          </>}
          {action === "reconcile" && <>
            <div className="receipt-selection-heading"><div><strong>1. Giao dịch ngân hàng</strong><p>Chọn từ giao dịch thực tế đã được hệ thống tiếp nhận.</p></div>
              <Button icon={<SearchOutlined />} onClick={() => setPickerOpen(true)}>{receipt ? 'Đổi giao dịch' : 'Chọn giao dịch'}</Button></div>
            {receiptLoading && <Spin aria-label="Đang lấy thông tin giao dịch mới nhất" />}
            {receiptError && <Alert type="error" message={receiptError} />}
            {receipt && <>
              <section className="receipt-selected-card">
                <div className="receipt-selected-top"><span><BankOutlined /> {receipt.bank || 'Chưa rõ ngân hàng'} · {receipt.maskedAccount || 'Chưa có tài khoản'}</span>
                  <strong>{money(receipt.amount)}</strong></div>
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" layout="vertical" items={[
                  { key: 'transaction', label: 'Mã giao dịch ngân hàng', children: receipt.transactionId },
                  { key: 'time', label: receipt.bankOccurredAt ? 'Thời gian ngân hàng' : 'Thời gian tiếp nhận', children: orderDate(receipt.bankOccurredAt || receipt.receivedAt, locale) },
                  { key: 'content', label: 'Nội dung chuyển khoản', children: receipt.content || 'Không có nội dung', span: 2 },
                  { key: 'state', label: 'Trạng thái giao dịch', children: t(`receiptStatuses.${receipt.status}`, { defaultValue: receipt.status }) },
                  { key: 'linked', label: receipt.matchedOrderCode ? 'Đã phân bổ cho đơn' : 'Đơn được tham chiếu', children: receipt.matchedOrderCode || receipt.candidateOrderCode || 'Chưa xác định' },
                ]} />
                {receipt.reason && <p className="receipt-search-hint">{t(`receiptReasons.${receipt.reason}`, { defaultValue: receipt.reason })}</p>}
                <p className="receipt-comparison">{receipt.amount === snapshot.order.amount ? 'Số tiền bằng tổng thanh toán của đơn.'
                  : `Số tiền ${receipt.amount > snapshot.order.amount ? 'cao hơn' : 'thấp hơn'} tổng đơn ${money(Math.abs(receipt.amount - snapshot.order.amount))}.`} Đây chỉ là đối chiếu với tổng đơn, không phải số còn phải thu.</p>
              </section>
              {selectionIssue && <Alert type="error" showIcon message="Chưa thể dùng giao dịch này" description={selectionIssue} />}
              {receipt.conflictCount > 0 && <>
                <Alert type="warning" showIcon message={`Có ${receipt.conflictCount} lần ghi nhận xung đột. So sánh bản gốc và các biến thể trước khi quyết định.`} />
                <ReceiptConflictList key={`${receipt.id}-${receipt.version}`} receiptId={receipt.id} disabled={busy || uncertain} onReady={setConflictsReady} />
                <Form.Item name="acceptOriginalConflict" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error("Cần xác nhận giữ bản gốc.")) }]}>
                  <Checkbox>Tôi đã xem các biến thể và chấp nhận dữ liệu bản gốc (không thay bằng biến thể).</Checkbox>
                </Form.Item>
              </>}
            </>}
            <Form.Item name="target" label="2. Khoản chuyển khoản cần đối soát" rules={[{ required: true, message: 'Chọn khoản chuyển khoản cần đối soát.' }]}
              extra={targets.length === 1 ? 'Đã chọn khoản chuyển khoản duy nhất có thể đối soát của đơn.' : 'Chọn thanh toán của đơn hoặc khoản chuyển khoản đã khai tại quầy.'}>
              <Select options={targets} placeholder="Chọn khoản chuyển khoản" /></Form.Item>
            <Alert type="info" showIcon message="Cần khớp ngân hàng, tài khoản nhận và chi nhánh."
              description="Số tiền giống nhau không đủ để xác nhận giao dịch. Đối soát không mở lại đơn đã hủy hoặc hết hạn; tiền dư không tự hoàn và không tự tính thành doanh thu." />
          </>}
          <Form.Item name="reason" label={action === 'reconcile' ? '3. Căn cứ xác nhận giao dịch' : 'Lý do / bằng chứng nghiệp vụ'} rules={reasonRules}>
            <Input.TextArea maxLength={500} showCount rows={3} placeholder={action === 'reconcile' ? 'Ghi rõ căn cứ đã kiểm tra: nội dung chuyển khoản, thông tin khách xác nhận, sao kê ngân hàng…' : undefined} /></Form.Item>
          {!uncertain && <Space><Button type="primary" htmlType="submit" loading={busy}
            disabled={loading || action === "reconcile" && (!receipt || receiptLoading || !!selectionIssue || receipt.conflictCount > 0 && !conflictsReady)}>{action === 'reconcile' ? 'Kiểm tra & xác nhận' : 'Gửi yêu cầu'}</Button>
            <Button onClick={() => { setAction(null); setRevision(value => value + 1); }}>Hủy thao tác</Button></Space>}
        </Form>}
        {uncertain && <Button type="primary" loading={busy} onClick={() => void send()}>Gửi lại để xác minh kết quả</Button>}
        {!action && <section className="order-section"><RefundsPanel orderId={orderId} revision={revision} onChanged={onChanged} /></section>}
      </>}
    </Space>
    {pickerOpen && snapshot && <ReceiptPicker snapshot={snapshot} selectedId={receiptId} onSelect={selectReceipt} onClose={() => setPickerOpen(false)} />}
    <AdminModal className="admin-order-modal" centered width={560} open={confirmation !== null} title="Xác nhận đối soát giao dịch" subtitle={snapshot?.order.orderCode}
      okText="Xác nhận đối soát" cancelText="Kiểm tra lại" confirmLoading={busy} onCancel={() => setConfirmation(null)}
      okButtonProps={{ disabled: !receipt || receiptLoading || !!selectionIssue }} onOk={() => { if (confirmation) void send(confirmation, true); }}>
      {receipt && snapshot && <><Descriptions column={1} size="small" items={[
        { key: 'bank', label: 'Giao dịch ngân hàng', children: `${receipt.transactionId} · ${receipt.bank || 'Chưa rõ ngân hàng'} · ${receipt.maskedAccount}` },
        { key: 'amount', label: 'Số tiền giao dịch', children: <strong className="order-amount">{money(receipt.amount)}</strong> },
        { key: 'order', label: 'Đơn hàng', children: snapshot.order.orderCode },
        { key: 'target', label: 'Khoản đối soát', children: targets.find(target => target.value === confirmation?.target)?.label },
        { key: 'reason', label: 'Căn cứ xác nhận', children: confirmation?.reason },
      ]} />
        <Alert type="warning" showIcon message="Chỉ xác nhận khi đã kiểm tra đúng giao dịch và đơn hàng."
          description="Hệ thống kiểm tra lại dữ liệu và phiên bản trước khi ghi nhận. Đối soát không đồng nghĩa đơn đã hoàn thành hoặc tiền đã được hoàn trả." /></>}
    </AdminModal>
  </Modal>;
}

export function ReceiptConflictList({ receiptId, disabled = false, onReady }: { receiptId: string; disabled?: boolean; onReady?: (ready: boolean) => void }) {
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
      { title: "Số tiền biến thể", dataIndex: "amount", render: money }, { title: "Ngân hàng", dataIndex: "bank" },
      { title: "Tài khoản", dataIndex: "maskedAccount" }, { title: "Nội dung", dataIndex: "content" },
      { title: "Chiều", dataIndex: "direction" }, { title: "Giờ ngân hàng", dataIndex: "bankTime" },
      { title: "Cùng tài khoản / tài khoản phụ", render: (_, entry) => `${entry.sameAccount ? 'Có' : 'Không'} / ${entry.subAccount ? 'Có' : 'Không'}` },
      { title: "Lần cuối", dataIndex: "lastSeenAt" }, { title: "Số lần", dataIndex: "occurrences" },
    ]} />
    <Space><Button disabled={disabled || loading || page === 0} onClick={() => { onReady?.(false); setPage(value => value - 1); }}>Trang trước</Button>
      <span>Trang {page + 1}</span><Button disabled={disabled || loading || conflicts.length < 20} onClick={() => { onReady?.(false); setPage(value => value + 1); }}>Trang sau</Button></Space>
  </Space>;
}

export function FinanceLookup({ receiptId, initialCode, onChanged }: { receiptId?: string; initialCode?: string; onChanged: () => void }) {
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
      <Form.Item name="orderCode" label="Mã đơn cần thu tiền / đối soát / tiếp nhận legacy" rules={[{ required: true, whitespace: true, max: 80 }]}>
        <Input maxLength={80} onChange={() => { lookup.current?.abort(); setLoading(false); setError(""); }} />
      </Form.Item>
      <Button htmlType="submit" loading={loading}>Mở tài chính đơn</Button>
    </Form>
    {error && <Alert type="error" message={error} />}
    {orderId !== null && <FinanceModal key={`${orderId}-${receiptId || ''}`} orderId={orderId} receiptId={receiptId} onClose={() => setOrderId(null)} onChanged={onChanged} />}
  </>;
}
