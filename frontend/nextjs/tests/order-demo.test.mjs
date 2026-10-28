import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { applyDemoAction, isFloatingCartRoute } from "../lib/order-demo.ts";

const order = {
  id: "local-test",
  orderCode: "DEMO-TEST",
  status: "PENDING_PAYMENT",
  paymentMethod: "BANK_TRANSFER",
  paymentStatus: "PENDING",
  totalAmount: 129000,
  timeline: [],
};
const now = "2026-10-28T12:00:00.000Z";

test("bank payment changes both local statuses, preserves totals and records history", () => {
  const result = applyDemoAction(order, "PAY_SUCCESS", true, now);
  assert.equal(result.ok, true);
  assert.equal(result.order.status, "CONFIRMED");
  assert.equal(result.order.paymentStatus, "PAID");
  assert.equal(result.order.totalAmount, 129000);
  assert.equal(result.order.updatedAt, now);
  assert.equal(result.order.timeline.length, 1);
  assert.equal(order.status, "PENDING_PAYMENT");
});

test("a second payment never duplicates history or confirms again", () => {
  const paid = applyDemoAction(order, "PAY_SUCCESS", true, now).order;
  const result = applyDemoAction(paid, "PAY_SUCCESS", true, now);
  assert.equal(result.ok, false);
  assert.equal(result.order, paid);
  assert.equal(result.order.timeline.length, 1);
});

test("paid demo order can finish through the MVP preparation steps", () => {
  let current = applyDemoAction(order, "PAY_SUCCESS", true, now).order;
  for (const status of ["PREPARING", "READY", "COMPLETED"]) {
    const result = applyDemoAction(current, "ADVANCE", true, now);
    assert.equal(result.ok, true);
    assert.equal(result.order.status, status);
    current = result.order;
  }
  assert.equal(current.timeline.filter((event) => event.current).length, 1);
  assert.equal(applyDemoAction(current, "ADVANCE", true, now).ok, false);
});

test("failed payment cancels the local demo order and prevents retry on a cancelled snapshot", () => {
  const failed = applyDemoAction(order, "PAY_FAILED", true, now);
  assert.equal(failed.order.paymentStatus, "FAILED");
  assert.equal(failed.order.status, "CANCELLED");
  assert.equal(
    applyDemoAction(failed.order, "PAY_SUCCESS", true, now).ok,
    false,
  );
});

test("COD must be collected before completion; collection cannot repeat", () => {
  const cod = { ...order, status: "READY", paymentMethod: "COD" };
  assert.equal(applyDemoAction(cod, "ADVANCE", true, now).ok, false);
  const paid = applyDemoAction(cod, "COLLECT_COD", true, now).order;
  assert.equal(paid.status, "READY");
  assert.equal(applyDemoAction(paid, "COLLECT_COD", true, now).ok, false);
  assert.equal(
    applyDemoAction(paid, "ADVANCE", true, now).order.status,
    "COMPLETED",
  );
});

test("disabled demo cannot mutate payment or processing state", () => {
  for (const action of [
    "PAY_SUCCESS",
    "PAY_FAILED",
    "COLLECT_COD",
    "ADVANCE",
  ]) {
    const result = applyDemoAction(order, action, false, now);
    assert.equal(result.ok, false);
    assert.equal(result.order, order);
  }
});

test("production demo controls require the explicit frontend flag", () => {
  const moduleUrl = new URL("../lib/order-demo.ts", import.meta.url).href;
  for (const [environment, flag, expected] of [
    ["production", "false", false],
    ["production", "true", true],
    ["development", "false", true],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `const {DEMO_CONTROLS_ENABLED} = await import(${JSON.stringify(moduleUrl)}); if(DEMO_CONTROLS_ENABLED !== ${expected}) process.exit(1);`,
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: environment,
          NEXT_PUBLIC_M3_DEMO_ENABLED: flag,
        },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
  }
});

test("floating cart only belongs on customer shopping routes", () => {
  for (const route of ["/", "/menu", "/menu/ga-ran-truyen-thong"])
    assert.equal(isFloatingCartRoute(route), true);
  for (const route of [
    "/cart",
    "/checkout",
    "/orders",
    "/orders/local-1",
    "/party",
    "/account",
    "/admin/orders",
    "/stores",
  ])
    assert.equal(isFloatingCartRoute(route), false);
});
