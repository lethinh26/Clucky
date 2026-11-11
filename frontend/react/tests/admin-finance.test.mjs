import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import i18n from "../src/i18n/index.ts";

const source = readFileSync(new URL("../src/lib/admin-finance.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source.replace(/^import .* from "(?:\.\/api|\.\.\/i18n\/index\.ts)";\r?\n/gm, ""), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
vm.runInNewContext(compiled.outputText, { module, exports: module.exports, crypto: webcrypto, i18n });
const { validCollection, canCollect, collectionBody, canAdopt, collectionState, reconciliationBody, receiptSelectionIssue, financeOperation, orderForAdmin } = module.exports;
const future = new Date(Date.now() + 3600000).toISOString();
const past = new Date(Date.now() - 3600000).toISOString();
const snapshot = {
  order: { orderId: 17, orderCode: "CLU17", amount: 150, paymentStatus: "PENDING", status: "PENDING_PAYMENT", paymentMethod: "BANK_TRANSFER", version: "2026-11-11T01:02:03.123456Z", expiresAt: future },
  payments: [{ id: 42, method: "BANK_TRANSFER", amount: 150, status: "PENDING", version: 3, live_payment: true, expires_at: future }],
};
const amounts = { cashAmount: 100, transferAmount: 50, cashTendered: 200, cashChange: 100, reason: "  Đã kiểm tiền  " };
const receipt = { id: "123", version: 5, amount: 50, direction: "in", conflictCount: 0 };
const collection = { id: "40cce11b-24e1-4c08-bf5a-07c42bd0d4d2", status: "ACCEPTED", version: 2, transfer_amount: 50, pendingTransfer: 0, discrepancy: 0, bankExcess: 0 };

test('receipt picker rejects known mismatches without treating matching amounts or unclassified receipts as proof', () => {
  const order = { ...snapshot.order, storeId: 2 };
  assert.equal(receiptSelectionIssue({ ...receipt, storeId: null }, order), '');
  assert.equal(receiptSelectionIssue({ ...receipt, storeId: 2, amount: order.amount }, order), '');
  assert.equal(receiptSelectionIssue({ ...receipt, storeId: 2, conflictCount: 1 }, order), '');
  for (const patch of [{ direction: 'out' }, { direction: null }, { amount: 0 }, { amount: -1 }, { amount: NaN },
    { storeId: 3 }, { matchedOrderCode: 'OTHER' }, { candidateOrderCode: 'OTHER' },
    { reason: 'STORE_ORDER_CONFLICT' }, { reason: 'STORE_REFERENCE_CONFLICT' }, { reason: 'AMBIGUOUS_REFERENCE' }, { reason: 'SUB_ACCOUNT_REVIEW' }]) {
    assert.ok(receiptSelectionIssue({ ...receipt, ...patch }, order));
    assert.throws(() => reconciliationBody({ ...receipt, ...patch }, { ...snapshot, order }, 'payment:42', 'Đã kiểm tra', false));
  }
  assert.equal(receiptSelectionIssue({ ...receipt, storeId: 2, matchedOrderCode: order.orderCode, candidateOrderCode: order.orderCode }, order), '');
  assert.throws(() => reconciliationBody({ ...receipt, conflictCount: 1 }, { ...snapshot, order }, 'payment:42', 'Đã kiểm tra', false));
});

test("collection validates VND arithmetic, bounds, and reasons without masking discrepancies", () => {
  assert.ok(validCollection(amounts));
  for (const value of [-1, 0.1, NaN, Infinity, 1000000000000, null, "100"]) {
    assert.equal(validCollection({ ...amounts, transferAmount: value }), false);
  }
  assert.equal(validCollection({ ...amounts, cashChange: 99 }), false);
  assert.equal(validCollection({ ...amounts, cashTendered: 99, cashChange: 0 }), false);
  for (const reason of ["", " ", "x\0y", "x".repeat(501)]) assert.equal(validCollection({ ...amounts, reason }), false);
  const body = collectionBody(snapshot, { ...amounts, transferAmount: 40, paymentId: 999 });
  assert.equal(body.orderVersion, snapshot.order.version);
  assert.equal(body.transferAmount, 40);
  assert.equal(body.reason, "Đã kiểm tiền");
  assert.equal("paymentId" in body, false);
});

test("collection eligibility mirrors order state, active collection and expired payment guards", () => {
  assert.ok(canCollect(snapshot));
  for (const status of ["SHIPPING", "COMPLETED", "CANCELLED"]) assert.equal(canCollect({ ...snapshot, order: { ...snapshot.order, status } }), false);
  for (const status of ["PENDING", "ACCEPTED"]) assert.equal(canCollect({ ...snapshot, collection: { status } }), false);
  assert.equal(canCollect({ ...snapshot, order: { ...snapshot.order, paymentStatus: "PAID" } }), false);
  assert.equal(canCollect({ ...snapshot, order: { ...snapshot.order, expiresAt: past } }), false);
  assert.equal(canCollect({ ...snapshot, payments: [{ ...snapshot.payments[0], expires_at: past }] }), false);
  assert.equal(canCollect({ ...snapshot, order: { ...snapshot.order, amount: 0 } }), false);
  assert.throws(() => collectionBody({ ...snapshot, collection: { status: "PENDING" } }, amounts));
});

test("pending and accepted collection are not claimed as reconciled with missing evidence or excess", () => {
  assert.equal(collectionState({ ...collection, status: "PENDING" }), "PENDING");
  assert.equal(collectionState({ ...collection, pendingTransfer: 1 }), "ACCEPTED");
  assert.equal(collectionState({ ...collection, discrepancy: -1 }), "ACCEPTED");
  assert.equal(collectionState({ ...collection, bankExcess: 1 }), "ACCEPTED");
  assert.equal(collectionState(collection), "RECONCILED");
  assert.equal(collectionState({ ...collection, status: "STALE_VERSION" }), "STALE_VERSION");
});

test("legacy adoption requires a single matching, pending and unexpired non-live bank payment", () => {
  const payment = { ...snapshot.payments[0], live_payment: false };
  const legacy = { ...snapshot, payments: [payment] };
  assert.ok(canAdopt(legacy, payment));
  assert.equal(canAdopt(snapshot, snapshot.payments[0]), false);
  assert.equal(canAdopt({ ...legacy, payments: [payment, { ...payment, id: 43 }] }, payment), false);
  for (const patch of [{ amount: 151 }, { method: "COD" }, { status: "EXPIRED" }, { expires_at: past }]) assert.equal(canAdopt(legacy, { ...payment, ...patch }), false);
  assert.equal(canAdopt({ ...legacy, order: { ...legacy.order, status: "CANCELLED" } }, payment), false);
});

test("reconciliation includes receipt and target versions and exactly one target", () => {
  const payment = reconciliationBody(receipt, snapshot, "payment:42", " link ", false);
  assert.equal(payment.receiptId, 123);
  assert.equal(payment.receiptVersion, 5);
  assert.equal(payment.paymentId, 42);
  assert.equal(payment.targetVersion, 3);
  assert.equal(payment.reason, "link");
  assert.equal("collectionId" in payment, false);
  const linked = reconciliationBody(receipt, { ...snapshot, collection }, "collection", "evidence", false);
  assert.equal(linked.collectionId, collection.id);
  assert.equal(linked.targetVersion, 2);
  assert.equal("paymentId" in linked, false);
  assert.throws(() => reconciliationBody(receipt, snapshot, "payment:999", "link", false));
  assert.throws(() => reconciliationBody(receipt, { ...snapshot, payments: [{ ...snapshot.payments[0], version: -1 }] }, "payment:42", "link", false));
  assert.throws(() => reconciliationBody(receipt, { ...snapshot, collection: { ...collection, status: "PENDING" } }, "collection", "link", false));
  assert.throws(() => reconciliationBody(receipt, { ...snapshot, collection: { ...collection, transfer_amount: 0 } }, "collection", "link", false));
});

test("receipt conflicts require explicit original-payload consent and valid incoming evidence", () => {
  assert.throws(() => reconciliationBody({ ...receipt, conflictCount: 1 }, snapshot, "payment:42", "review", false));
  assert.equal(reconciliationBody({ ...receipt, conflictCount: 1 }, snapshot, "payment:42", "review", true).acceptOriginalConflict, true);
  for (const patch of [{ direction: "out" }, { version: -1 }, { amount: 0 }, { id: "9007199254740993" }]) {
    assert.throws(() => reconciliationBody({ ...receipt, ...patch }, snapshot, "payment:42", "review", false));
  }
});

test("an uncertain retry keeps the exact operation, body and UUID; changed intent gets a new key", () => {
  const body = collectionBody(snapshot, amounts);
  const first = financeOperation(17, "collection", body);
  assert.match(first.key, /^[a-f0-9-]{36}$/);
  assert.equal(first.path, "/api/payments/17/operations/collection");
  assert.strictEqual(financeOperation(17, "collection", { ...body }, first), first);
  assert.strictEqual(first.body, body);
  assert.notEqual(financeOperation(18, "collection", body, first).key, first.key);
  assert.notEqual(financeOperation(17, "collection", { ...body, orderVersion: "new-version" }, first).key, first.key);
  assert.notEqual(financeOperation(17, "reconcile", body, first).key, first.key);
});

test("per-order refund identity is retained rather than joined from the first global page", () => {
  const order = orderForAdmin({ id: 17, orderCode: "CLU17", customerId: 8, storeId: 2, status: "CANCELLED", paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID", totalAmount: 150, subtotal: 150, createdAt: future },
    { id: 501, orderId: 17, status: "PROCESSING", amount: 150, reason: "cancel" });
  assert.equal(order.refundRequestId, 501);
  assert.equal(order.refundStatus, "PROCESSING");
  assert.equal(order.hasRefundRequest, true);
});
