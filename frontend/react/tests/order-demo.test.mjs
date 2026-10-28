import test from "node:test";
import assert from "node:assert/strict";
import { applyAdminDemoAction } from "../src/lib/order-demo.ts";

const order = {
  id: "1",
  storeId: "1",
  status: "CONFIRMED",
  paymentMethod: "COD",
  paymentStatus: "PENDING",
  total: 129000,
  timeline: [],
};
const now = "2026-10-28T12:00:00.000Z";

test("staff can process the assigned store through valid stages", () => {
  let current = applyAdminDemoAction(
    order,
    { type: "STATUS", status: "PREPARING" },
    "STAFF",
    1,
    now,
  ).order;
  assert.equal(current.status, "PREPARING");
  current = applyAdminDemoAction(
    current,
    { type: "STATUS", status: "READY" },
    "STAFF",
    1,
    now,
  ).order;
  assert.equal(current.status, "READY");
  assert.equal(
    applyAdminDemoAction(
      current,
      { type: "STATUS", status: "COMPLETED" },
      "STAFF",
      1,
      now,
    ).ok,
    false,
  );
  current = applyAdminDemoAction(
    current,
    { type: "COD" },
    "STAFF",
    1,
    now,
  ).order;
  const complete = applyAdminDemoAction(
    current,
    { type: "STATUS", status: "COMPLETED" },
    "STAFF",
    1,
    now,
  );
  assert.equal(complete.order.status, "COMPLETED");
  assert.equal(complete.order.timeline.length, 4);
});

test("invalid jumps and repeat COD confirmation leave the order unchanged", () => {
  assert.equal(
    applyAdminDemoAction(
      order,
      { type: "STATUS", status: "COMPLETED" },
      "STAFF",
      1,
      now,
    ).ok,
    false,
  );
  const paid = applyAdminDemoAction(
    order,
    { type: "COD" },
    "STAFF",
    1,
    now,
  ).order;
  assert.equal(
    applyAdminDemoAction(paid, { type: "COD" }, "STAFF", 1, now).ok,
    false,
  );
});

test("demo UI role scope rejects another store while admin can access it", () => {
  assert.equal(
    applyAdminDemoAction(order, { type: "COD" }, "STAFF", 2, now).ok,
    false,
  );
  assert.equal(
    applyAdminDemoAction(order, { type: "COD" }, "STORE_MANAGER", 2, now).ok,
    false,
  );
  assert.equal(
    applyAdminDemoAction(order, { type: "COD" }, "ADMIN", undefined, now).ok,
    true,
  );
});

test("cancellation requires a reason and a paid cancellation creates a pending refund snapshot", () => {
  assert.equal(
    applyAdminDemoAction(
      order,
      { type: "STATUS", status: "CANCELLED" },
      "STAFF",
      1,
      now,
    ).ok,
    false,
  );
  const result = applyAdminDemoAction(
    { ...order, paymentStatus: "PAID" },
    { type: "STATUS", status: "CANCELLED", reason: "Hết món" },
    "STAFF",
    1,
    now,
  );
  assert.equal(result.order.hasRefundRequest, true);
  assert.equal(result.order.refundStatus, "PENDING");
  assert.equal(result.order.refundAmount, 129000);
});

test("staff cannot review refunds; manager rejection requires a note", () => {
  const refund = { ...order, hasRefundRequest: true };
  assert.equal(
    applyAdminDemoAction(
      refund,
      { type: "REFUND", decision: "APPROVED", note: "" },
      "STAFF",
      1,
      now,
    ).ok,
    false,
  );
  assert.equal(
    applyAdminDemoAction(
      refund,
      { type: "REFUND", decision: "REJECTED", note: "" },
      "STORE_MANAGER",
      1,
      now,
    ).ok,
    false,
  );
  const result = applyAdminDemoAction(
    refund,
    { type: "REFUND", decision: "APPROVED", note: "Đã kiểm tra" },
    "STORE_MANAGER",
    1,
    now,
  );
  assert.equal(result.order.refundStatus, "APPROVED");
  assert.equal(result.order.hasRefundRequest, false);
});
