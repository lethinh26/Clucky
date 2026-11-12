import { test, expect } from "@playwright/test";
import { seedApi } from "../fixtures/api";

test("customer notifications load from the API and persist read state across reloads", async ({ page }) => {
  await seedApi(page);
  const notifications = [{ id: 12, userId: 1, type: "ORDER", refId: 42, title: "Order ready from server", content: "Ready at the selected branch", isRead: false, createdAt: new Date().toISOString() }];
  let reads = 0;
  await page.route("**/api/notifications/my?*", route => {
    const unread = new URL(route.request().url()).searchParams.get("unread") === "true";
    const content = notifications.filter(item => !unread || !item.isRead);
    return route.fulfill({ json: { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, unreadCount: notifications.filter(item => !item.isRead).length } });
  });
  await page.route("**/api/notifications/read-all", route => {
    expect(route.request().method()).toBe("PUT"); reads++;
    notifications.forEach(item => { item.isRead = true; });
    return route.fulfill({ json: { updatedCount: 1 } });
  });
  await page.goto("http://127.0.0.1:4174/notifications");
  await expect(page.getByRole("article")).toContainText("Order ready from server");
  await page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
  await expect(page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("article")).toHaveAttribute("aria-label", /Đã đọc/i);
  expect(reads).toBe(1);
  await expect(page.getByRole("button", { name: /Xóa thông báo/ })).toHaveCount(0);
});

test("notification failure has retry and no sample notifications", async ({ page }) => {
  await seedApi(page);
  await page.route("**/api/notifications/my?*", route => route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } }));
  await page.goto("http://127.0.0.1:4174/notifications");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.route("**/api/notifications/my?*", route => route.fulfill({ json: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0 } }));
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa có thông báo" })).toBeVisible();
});
