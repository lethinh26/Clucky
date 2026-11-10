import { test, expect } from "@playwright/test";

const payment = {
  orderId: 1, status: "PENDING", expiresAt: new Date(Date.now() + 600000).toISOString(),
  reference: "CLUCKY001X1234567890ABCDEF1234567890ABCDEF",
  bankInfo: { bankName: "MBBank", bankCode: "MB", accountNo: "0001234567", accountName: "CLUCKY" },
  amount: "10000", receivedAmount: "0", missingAmount: "10000", excessAmount: "0",
  confirmationPending: false, canTransfer: true, closedReason: null,
};

test("payment stays compact while manual details and excess remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.route("**/api/auth/session", route => route.fulfill({ json: { userId: 1, role: "CUSTOMER", fullName: "Customer" } }));
  let current = { ...payment };
  await page.route("**/api/payments/1", route => route.fulfill({ json: current }));
  await page.route("https://vietqr.app/img?*", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/></svg>' }));
  await page.goto("http://127.0.0.1:4175/?live-payment");
  await expect(page.getByRole("img")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sao chép số tài khoản" })).toBeHidden();
  await page.locator("summary").filter({ hasText: "Chuyển khoản thủ công" }).click();
  await expect(page.getByRole("button", { name: "Sao chép số tài khoản" })).toBeVisible();
  await expect(page.getByText(payment.reference, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  current = { ...payment, status: "PAID", receivedAmount: "10000", missingAmount: "0", canTransfer: false };
  await page.reload();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  await expect(page.getByRole("img")).toHaveCount(0);
  await expect(page.getByText("Tiền dư", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Khoản tiền này cần cửa hàng xử lý/)).toHaveCount(0);

  current = { ...current, receivedAmount: "12000", excessAmount: "2000" };
  await page.reload();
  await expect(page.getByText(/Khoản tiền này cần cửa hàng xử lý/)).toBeVisible();
});

test("admin separates transactions and bank settings without technical banners", async ({ page }) => {
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    const responses: Record<string, unknown> = {
      "/api/auth/session": { userId: 2, role: "ADMIN", fullName: "Admin" },
      "/api/payments/bank-config": { accounts: [], assignments: [], sepayKeyConfigured: true, reconciliationAvailable: true },
      "/api/payments/transactions": { page: { content: [], totalElements: 0 }, lastReceivedAt: null },
    };
    return route.fulfill({ json: responses[path] ?? [] });
  });
  await page.goto("http://127.0.0.1:4173/admin/payments");
  await expect(page.getByRole("tab", { name: "Giao dịch", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Thêm tài khoản", exact: true })).toBeHidden();
  await expect(page.getByText(/Đang mở: QR Customer/)).toHaveCount(0);
  await page.getByRole("tab", { name: "Tài khoản nhận tiền", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thêm tài khoản", exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Tìm tên, mã hoặc địa chỉ chi nhánh", exact: true })).toBeVisible();
  await expect(page.getByText("Hướng dẫn & lưu ý", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Thu quầy & đối soát", exact: true })).toHaveCount(0);
});
