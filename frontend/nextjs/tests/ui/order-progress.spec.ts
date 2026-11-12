import { test, expect } from "@playwright/test";
import { seedApi } from "../fixtures/api";
import { seedOrder } from "../fixtures/order";
import type { BackendOrderStatusHistory } from "../../lib/api";

const customer = "http://127.0.0.1:4174";

for (const locale of ["vi", "en"] as const) {
  for (const type of ["PICKUP", "DELIVERY"] as const) {
    test(`${locale} ${type}: localized history and distinct fulfillment steps`, async ({ page, context }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await context.addCookies([{ name: "clucky_locale", value: locale, url: customer }]);
      await seedApi(page);
      const order = await seedOrder(page);
      order.type = type;
      order.status = type === "PICKUP" ? "READY" : "SHIPPING";
      const timeline: BackendOrderStatusHistory[] = [
        { id: 1, toStatus: "PENDING_PAYMENT", reason: "Order created with payment method: BANK_TRANSFER", createdAt: order.createdAt },
        { id: 2, toStatus: "CONFIRMED", reason: "SEPAY_PAYMENT_RECEIVED", createdAt: order.createdAt },
        { id: 3, toStatus: "PREPARING", reason: "Ghi chú của cửa hàng", createdAt: order.createdAt },
        { id: 4, toStatus: "READY", reason: "Status updated to READY", createdAt: order.createdAt },
      ];
      if (type === "DELIVERY") timeline.push({ id: 5, toStatus: "SHIPPING", reason: "Status updated to SHIPPING", createdAt: order.createdAt });
      await page.route("**/api/orders/901", route => route.fulfill({ json: {
        ...order, id: 901, customerId: 1, storeId: 1, timeline,
      } }));
      await page.route("**/api/payments/901", route => route.fulfill({ json: {
        orderId: 901, status: "PAID", expiresAt: order.createdAt, reference: "CLUCKY001X8F3A92C1X",
        bankInfo: { bankName: "MBBank", bankCode: "MB", accountNo: "000000", accountName: "TEST" },
        amount: "262000", receivedAmount: "262000", missingAmount: "0", excessAmount: "0",
        confirmationPending: false, canTransfer: false, closedReason: null,
      } }));
      await page.goto(`${customer}/orders/901`);
      await page.getByRole("button", { name: /CLU-20261028-TEST/ }).click();
      const rail = page.getByRole("list", { name: locale === "vi"
        ? (type === "PICKUP" ? "Tiến trình nhận tại quán" : "Tiến trình giao hàng")
        : (type === "PICKUP" ? "Pickup progress" : "Delivery progress") });
      await expect(rail.getByRole("listitem")).toHaveCount(type === "PICKUP" ? 6 : 7);
      const activeStatus = locale === "vi"
        ? (type === "PICKUP" ? "Chờ khách đến lấy" : "Đang giao hàng")
        : (type === "PICKUP" ? "Awaiting collection" : "Out for delivery");
      await expect(rail.locator('[aria-current="step"]')).toHaveText(activeStatus);
      await expect(page.getByText(`${activeStatus} · ${locale === "vi" ? "Cập nhật mỗi 5 giây" : "Updates every 5 seconds"}`, { exact: true })).toBeVisible();
      const history = page.getByRole("list", { name: locale === "vi" ? "Lịch sử cập nhật" : "Update history" });
      await expect(history).toContainText(locale === "vi"
        ? "Đã nhận thanh toán chuyển khoản và xác nhận đơn hàng."
        : "Bank transfer payment received and order confirmed.");
      await expect(history).toContainText(locale === "vi"
        ? "Đã đặt đơn, chờ thanh toán chuyển khoản."
        : "Order placed, awaiting bank transfer payment.");
      await expect(history).toContainText("Ghi chú của cửa hàng");
      await expect(page.locator("main")).not.toContainText(/PENDING_PAYMENT|SEPAY_PAYMENT_RECEIVED|Status updated to|Live Status/);
      if (type === "PICKUP") await expect(rail).not.toContainText(locale === "vi" ? "Đang giao hàng" : "Out for delivery");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      order.status = "COMPLETED";
      timeline.push({ id: 6, toStatus: "COMPLETED", reason: "Status updated to COMPLETED", createdAt: order.createdAt });
      await page.reload();
      await expect(rail.locator('[aria-current="step"]')).toHaveText(locale === "vi"
        ? (type === "PICKUP" ? "Đã nhận tại quán" : "Đã giao hàng")
        : (type === "PICKUP" ? "Collected at store" : "Delivered"), { timeout: 10000 });

      order.status = "CANCELLED";
      timeline.push({ id: 7, toStatus: "CANCELLED", reason: "PAYMENT_EXPIRED", createdAt: order.createdAt });
      await page.reload();
      await expect(rail).toHaveCount(0);
      await expect(history).toContainText(locale === "vi"
        ? "Đơn đã hủy do quá thời hạn thanh toán."
        : "Order cancelled because the payment deadline expired.", { timeout: 10000 });
    });
  }
}
