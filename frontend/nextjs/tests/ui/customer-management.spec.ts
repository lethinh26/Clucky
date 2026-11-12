import { test, expect } from "@playwright/test";
import { seedApi } from "../fixtures/api";

test("customer profiles use masked server fields and confirmed lock mutations refresh the directory", async ({ page }) => {
  await seedApi(page);
  let customer = { id: 17, fullName: "Customer From API", maskedEmail: "c***@example.com", maskedPhone: "***1234", status: "ACTIVE", createdAt: "2026-11-01T03:00:00Z" };
  await page.route("**/api/users/customers?*", route => route.fulfill({ json: { content: [customer], page: 0, size: 20, totalElements: 1, totalPages: 1 } }));
  await page.route(/\/api\/orders\?customerId=17.*/, route => route.fulfill({ json: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } }));
  await page.route("**/api/users/customers/17/lock", async route => {
    expect(route.request().postDataJSON()).toEqual({ reason: "Customer request", expectedStatus: "ACTIVE" });
    customer = { ...customer, status: "LOCKED" };
    await route.fulfill({ json: customer });
  });
  await page.goto("http://127.0.0.1:4173/admin/customers");
  await page.getByRole("button", { name: "Xem hồ sơ", exact: true }).click();
  const profile = page.getByRole("dialog");
  await expect(profile.getByText("c***@example.com", { exact: true })).toBeVisible();
  await expect(profile.getByText("***1234", { exact: true })).toBeVisible();
  await profile.getByRole("button", { name: "Khóa", exact: true }).click();
  const confirmation = page.getByRole("dialog").filter({ has: page.getByRole("textbox") });
  await confirmation.getByRole("textbox").fill("Customer request");
  await confirmation.getByRole("button", { name: "Khóa tài khoản", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(profile.getByRole("button", { name: "Mở khóa", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: customer.fullName })).toContainText("Đã khóa");
});
