import i18n from "../i18n/index.ts";
import { api, type BackendOrder, type BackendRefund, type PageResponse } from "./api";
import type { AdminOrder } from "../types/order";

export interface OrderQuery { page: number; size: number; storeId?: number; status?: string; orderCode?: string; customerId?: number; date?: string }
export interface RefundQuery { page: number; size: number; storeId?: number; status?: string; orderId?: number }
export interface ReceiptQuery { page: number; size: number; storeId?: number; status?: string; search?: string; bank?: string; conflictsOnly?: boolean; unclassifiedOnly?: boolean; from?: string; to?: string }
export interface Receipt {
  id: string; transactionId: string; amount: number; direction: string | null; bank: string | null;
  maskedAccount: string; content: string | null; receivedAt: string; bankOccurredAt: string | null;
  status: string; reason: string | null; storeId: number | null; matchedOrderCode: string | null;
  candidateOrderCode: string | null; replayCount: number; conflictCount: number; version: number;
  assignedBy: number | null; assignedAt: string | null; assignmentReason: string | null;
}
export interface ReceiptConflict { amount: number; bank: string; maskedAccount: string; content: string; direction: string; bankTime: string; sameAccount: boolean; subAccount: boolean; lastSeenAt: string; occurrences: number }
export interface Payment { id: number; method: string; status: string; amount: number; received_amount: number; expires_at: string | null; live_payment: boolean; version: number; legacy_adopted: boolean; transfer_content?: string | null; bank_name?: string | null; bank_code?: string | null; account_no?: string | null; account_name?: string | null }
export interface Collection {
  id: string; status: string; version: number; amount: number; cash_amount: number; transfer_amount: number;
  cash_tendered: number; cash_change: number; reason: string; actor_id: number; actor_role: string;
  bankEvidence: number; pendingTransfer: number; operationalReceived: number; discrepancy: number; bankExcess: number;
}
export interface PaymentSnapshot {
  order: { orderId: number; orderCode: string; storeId: number; amount: number; status: string; paymentStatus: string; paymentMethod: string; expiresAt: string | null; version: string };
  payments: Payment[]; collection?: Collection;
}
export interface CollectionInput { cashAmount: number; transferAmount: number; cashTendered: number; cashChange: number; reason: string }
export type FinanceOperation = { path: string; body: object; key: string; signature: string };

export function financeOperation(orderId: number, action: "collection" | "reconcile" | "legacy", body: object, previous?: FinanceOperation | null): FinanceOperation {
  const path = `/api/payments/${orderId}/operations/${action}`;
  const signature = JSON.stringify([path, body]);
  return previous?.signature === signature ? previous : { path, body, signature, key: crypto.randomUUID() };
}

export function validCollection(values: CollectionInput) {
  return [values.cashAmount, values.transferAmount, values.cashTendered, values.cashChange]
    .every(amount => Number.isSafeInteger(amount) && amount >= 0 && amount <= 999999999999)
    && values.cashTendered - values.cashAmount === values.cashChange
    && values.reason.trim().length > 0 && values.reason.length <= 500 && !values.reason.includes("\0");
}

export function canCollect(snapshot: PaymentSnapshot) {
  const { order, collection } = snapshot;
  return order.paymentStatus === "PENDING" && order.amount > 0
    && ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY"].includes(order.status)
    && !(order.status === "PENDING_PAYMENT" && order.expiresAt && Date.parse(order.expiresAt) <= Date.now())
    && !["PENDING", "ACCEPTED"].includes(collection?.status ?? "")
    && !snapshot.payments.some(payment => ["PENDING", "EXPIRED", "CANCELLED"].includes(payment.status)
      && payment.expires_at && Date.parse(payment.expires_at) <= Date.now());
}

export function collectionBody(snapshot: PaymentSnapshot, values: CollectionInput) {
  if (!validCollection(values) || !canCollect(snapshot)) throw { code: "VALIDATION_ERROR" };
  return { orderVersion: snapshot.order.version, cashAmount: values.cashAmount, transferAmount: values.transferAmount,
    cashTendered: values.cashTendered, cashChange: values.cashChange, reason: values.reason.trim() };
}

export function canAdopt(snapshot: PaymentSnapshot, payment: Payment) {
  return snapshot.payments.length === 1 && !payment.live_payment && payment.status === "PENDING"
    && payment.method === "BANK_TRANSFER" && snapshot.order.paymentMethod === "BANK_TRANSFER"
    && snapshot.order.status === "PENDING_PAYMENT" && snapshot.order.paymentStatus === "PENDING"
    && payment.amount === snapshot.order.amount && !!payment.expires_at && !!snapshot.order.expiresAt
    && Date.parse(payment.expires_at) === Date.parse(snapshot.order.expiresAt)
    && Date.parse(payment.expires_at) > Date.now();
}

export function collectionState(collection: Collection) {
  if (collection.status === "PENDING") return "PENDING";
  if (collection.status !== "ACCEPTED") return collection.status;
  return collection.pendingTransfer === 0 && collection.discrepancy === 0 && collection.bankExcess === 0
    ? "RECONCILED" : "ACCEPTED";
}

export function receiptSelectionIssue(receipt: Receipt, order: Pick<PaymentSnapshot['order'], 'storeId' | 'orderCode'>) {
  if (receipt.direction !== 'in') return i18n.t("admin:ui.thisIsNotAnIncomingTransaction");
  if (!Number.isSafeInteger(receipt.amount) || receipt.amount <= 0) return i18n.t("admin:ui.theTransactionAmountIsInvalid");
  if (receipt.storeId != null && receipt.storeId !== order.storeId) return i18n.t("admin:ui.thisTransactionBelongsToAnotherBranch");
  if (receipt.matchedOrderCode && receipt.matchedOrderCode !== order.orderCode) return i18n.t("admin:ui.alreadyAllocatedToOrder", { value1: receipt.matchedOrderCode });
  if (receipt.candidateOrderCode && receipt.candidateOrderCode !== order.orderCode) return i18n.t("admin:ui.theTransferReferencePointsToOrder", { value1: receipt.candidateOrderCode });
  if (['STORE_ORDER_CONFLICT', 'STORE_REFERENCE_CONFLICT', 'AMBIGUOUS_REFERENCE'].includes(receipt.reason ?? '')) return i18n.t("admin:ui.theBranchOrOrderReferenceIsInconsistentReview");
  if (receipt.reason === 'SUB_ACCOUNT_REVIEW') return i18n.t("admin:ui.subAccountTransactionsRequireASeparateReview");
  return '';
}

export function reconciliationBody(receipt: Receipt, snapshot: PaymentSnapshot, target: string, reason: string, acceptOriginalConflict: boolean) {
  if (!Number.isSafeInteger(Number(receipt.id)) || Number(receipt.id) <= 0 || !reason.trim() || reason.length > 500 || reason.includes("\0")
    || !Number.isSafeInteger(receipt.version) || receipt.version < 0 || receipt.direction !== "in"
    || !Number.isSafeInteger(receipt.amount) || receipt.amount <= 0 || receipt.conflictCount > 0 && !acceptOriginalConflict) throw { code: "VALIDATION_ERROR" };
  if (receiptSelectionIssue(receipt, snapshot.order)) throw { code: "RESOURCE_CONFLICT" };
  const payment = snapshot.payments.find(entry => target === `payment:${entry.id}`);
  const collection = target === "collection" ? snapshot.collection : undefined;
  if (payment ? payment.method !== "BANK_TRANSFER" : !collection || collection.status !== "ACCEPTED" || collection.transfer_amount <= 0) throw { code: "RESOURCE_CONFLICT" };
  const version = payment?.version ?? collection?.version;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) throw { code: "VALIDATION_ERROR" };
  return { receiptId: Number(receipt.id), receiptVersion: receipt.version,
    ...(payment ? { paymentId: payment.id, targetVersion: payment.version } : { collectionId: collection!.id, targetVersion: collection!.version }),
    reason: reason.trim(), acceptOriginalConflict };
}

export function orderForAdmin(order: BackendOrder, refund?: BackendRefund): AdminOrder {
  const status = order.status === "DELIVERED" ? "COMPLETED" : order.status as AdminOrder["status"];
  return { id: String(order.id), orderCode: order.orderCode, customerName: order.receiverName || `#${order.customerId}`,
    customerPhone: order.receiverPhone || "", storeId: String(order.storeId), storeName: `Clucky #${order.storeId}`,
    orderType: order.type || "DELIVERY", status, paymentMethod: order.paymentMethod as AdminOrder["paymentMethod"],
    paymentStatus: (order.paymentStatus || "UNKNOWN") as AdminOrder["paymentStatus"],
    items: (order.items || []).map(item => ({ ...item, id: String(item.id), unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })),
    subtotal: Number(order.subtotal), discount: Number(order.discountAmount || 0), shippingFee: Number(order.shippingFee || 0),
    total: Number(order.totalAmount), deliveryAddress: order.deliveryAddress, note: order.note, time: order.createdAt,
    createdAt: order.createdAt, updatedAt: order.updatedAt,
    timeline: order.timeline?.map(entry => ({ status: entry.toStatus as AdminOrder["status"], title: entry.toStatus,
      description: entry.reason || entry.toStatus, time: entry.createdAt, actor: entry.changedRole })),
    hasRefundRequest: !!refund && ["PENDING", "APPROVED", "PROCESSING", "WAITING_BANK_DETAILS"].includes(refund.status),
    refundRequestId: refund?.id, refundStatus: refund?.status, refundAmount: refund?.amount, refundReason: refund?.reason, refundData: refund };
}

function pageData<Value>(value: PageResponse<Value>): PageResponse<Value> {
  if (!value || !Array.isArray(value.content) || !Number.isInteger(value.page) || value.page < 0 || !Number.isInteger(value.size) || value.size < 1
      || !Number.isSafeInteger(value.totalElements) || value.totalElements < 0 || !Number.isInteger(value.totalPages) || value.totalPages < 0) throw { code: "UPSTREAM_ERROR" };
  return value;
}

export const adminFinance = {
  orderByCode: (code: string, signal?: AbortSignal) => api.get<BackendOrder>(`/api/orders/code/${encodeURIComponent(code)}`, { signal }).then(response => response.data),
  orders: (params: OrderQuery, signal?: AbortSignal) => api.get<PageResponse<BackendOrder>>("/api/orders", { params, signal }).then(response => pageData(response.data)),
  refunds: (params: RefundQuery, signal?: AbortSignal) => api.get<PageResponse<BackendRefund>>("/api/refund-requests", { params, signal }).then(response => pageData(response.data)),
  receipts: (params: ReceiptQuery, signal?: AbortSignal) => api.get<{ page: PageResponse<Receipt>; lastReceivedAt: string | null }>("/api/payments/transactions", { params, signal })
    .then(response => ({ ...response.data, page: pageData(response.data.page) })),
  receipt: (id: string, signal?: AbortSignal) => api.get<Receipt>(`/api/payments/transactions/${id}`, { signal }).then(response => response.data),
  conflicts: (id: string, page: number, signal?: AbortSignal) => api.get<ReceiptConflict[]>(`/api/payments/transactions/${id}/conflicts`, { params: { page }, signal }).then(response => response.data),
  snapshot: (id: number, signal?: AbortSignal) => api.get<PaymentSnapshot>(`/api/payments/${id}/operations`, { signal }).then(response => response.data),
  submit: (operation: FinanceOperation) => api.post(operation.path, operation.body, { headers: { "Idempotency-Key": operation.key } }).then(response => response.data),
};
