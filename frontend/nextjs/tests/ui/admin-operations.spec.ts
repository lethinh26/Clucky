import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { seedApi, testStore } from "../fixtures/api";

const admin = "http://127.0.0.1:4173";
const occurredAt = "2026-11-02T20:00:00Z";

test.beforeEach(async ({ page }) => {
  await seedApi(page);
  await page.route("**/api/notifications/admin/unread-count", route => route.fulfill({ json: { unreadCount: 0 } }));
});

test("email log timestamps render in Vietnam time in the list and delivery details", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const delivery = {
    id: 1, toEmail: "t***@example.com", subject: "Email preview test", status: "SENT", template: "ORDER_CONFIRMED",
    createdAt: occurredAt, sentAt: occurredAt, failureCode: null, retryCount: 0, eventId: "email-event",
    correlationId: "email-trace", nextAttemptAt: null, messageId: "email-message", storeId: 1, attemptCount: 1,
    generation: 0, expiresAt: "2026-11-03T20:00:00Z", canRetry: false, retryBlockedReason: "ALREADY_SENT",
    failureDeliveryStatus: "NONE",
  };
  await page.route(/\/api\/notifications\/email-logs\?.*$/, route => route.fulfill({ json: {
    content: [delivery], page: 0, size: 20, totalElements: 1, totalPages: 1,
  } }));
  await page.route("**/api/notifications/email-logs/1", route => route.fulfill({ json: {
    delivery, attempts: [{ attemptNumber: 1, generation: 0, startedAt: occurredAt, finishedAt: occurredAt, outcome: "SENT" }],
    failures: [], retries: [],
  } }));
  await page.goto(admin + "/admin/email-logs");
  const row = page.getByRole("row").filter({ hasText: delivery.subject });
  const timestamp = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(occurredAt));
  await expect(row).toContainText(timestamp);
  await row.getByRole("button").click();
  await expect(page.getByText(delivery.messageId, { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: timestamp, exact: true })).toHaveCount(4);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect.poll(() => page.getByRole("complementary").evaluate(element => element.getBoundingClientRect().top)).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("email-details.png"), fullPage: true });
});

test("audit rows expand on click and keyboard and export downloads an Excel attachment", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route(/\/api\/audit-logs\?.*$/, route => route.fulfill({ json: {
    content: [{ eventId: "audit-event", correlationId: "audit-trace", sourceService: "promotion-loyalty-service",
      actorId: 1, actorRole: "ADMIN", storeId: 1, action: "VOUCHER_UPDATED", targetType: "VOUCHER", targetId: 1,
      occurredAt, createdAt: occurredAt, detail: { before: { status: "DISABLED" }, after: { status: "ACTIVE" } } }],
    page: 0, size: 20, totalElements: 1, totalPages: 1,
  } }));
  const exportedBytes = Buffer.from("mock-workbook-body");
  await page.route("**/api/audit-logs/export", route => route.fulfill({
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: exportedBytes,
  }));
  await page.goto(admin + "/admin/audit");
  const row = page.locator(".audit-row");
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#audit-detail-audit-event")).toBeVisible();
  await row.focus();
  await row.press("Enter");
  await expect(row).toHaveAttribute("aria-expanded", "false");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Xuất Excel/ }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("clucky-nhat-ky-quan-tri.xlsx");
  expect(await readFile((await download.path())!)).toEqual(exportedBytes);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("audit.png"), fullPage: true });
});

test("voucher approval badge caps at 9+ and rejection sends a reason instead of deleting", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const vouchers = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, code: `PROPOSED${index + 1}`, title: `Proposal ${index + 1}`, type: "PERCENT", value: 10,
    minOrderAmount: 0, totalLimit: 100, usedCount: 0, reservedCount: 0, version: 1,
    startAt: "2026-01-01T00:00:00Z", endAt: "2099-01-01T00:00:00Z", scope: "STORE", storeId: testStore.id,
    status: "PENDING_APPROVAL", effectiveStatus: "PENDING_APPROVAL", rejectionReason: "",
  }));
  await page.route(/\/api\/promotions\/vouchers(?:\?.*)?$/, route => route.fulfill({ json: vouchers }));
  await page.route("**/api/promotions/vouchers/1/reject", async route => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ reason: "Please revise the discount", version: 1 });
    Object.assign(vouchers[0], { status: "REJECTED", effectiveStatus: "REJECTED", rejectionReason: "Please revise the discount" });
    await route.fulfill({ json: vouchers[0] });
  });
  await page.goto(admin + "/admin/promotions");
  const approvalTab = page.getByRole("tab", { name: /Duyệt voucher/ });
  await expect(approvalTab).toContainText("9+");
  await approvalTab.click();
  await page.getByRole("row").filter({ hasText: /PROPOSED1\b/ }).getByRole("button", { name: /Xét duyệt/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText(testStore.name);
  await expect(drawer.getByRole("button", { name: /Kích hoạt lại|Xóa/ })).toHaveCount(0);
  await drawer.getByRole("button", { name: /Từ chối đề xuất/ }).click();
  await drawer.getByRole("textbox", { name: "Lý do từ chối" }).fill("Please revise the discount");
  await drawer.getByRole("button", { name: /Từ chối và gửi lại chi nhánh/ }).click();
  await expect(drawer).toContainText("Please revise the discount");
  await expect(drawer).toContainText("Đã từ chối");
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("voucher-rejected.png"), fullPage: true });
});
