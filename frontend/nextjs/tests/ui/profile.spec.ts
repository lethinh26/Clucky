import { test, expect } from "@playwright/test";

test("profile loads after a shared refresh and persists an allowed update", async ({ page }) => {
  let refreshes = 0;
  let updates = 0;
  let refreshed = false;
  let profile = { id: 7, fullName: "Profile Customer", email: "customer@example.com", phone: "0901234567", role: "CUSTOMER" };
  await page.addInitScript(() => localStorage.setItem("clucky_access_token", "expired"));
  await page.route("**/api/auth/refresh", async (route) => {
    refreshes++;
    expect(route.request().headers().authorization).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    refreshed = true;
    await route.fulfill({ json: { ...profile, userId: profile.id } });
  });
  await page.route("**/api/auth/session", route => route.fulfill({
    status: refreshed ? 200 : 401,
    json: refreshed ? { ...profile, userId: profile.id } : { code: "UNAUTHENTICATED" },
  }));
  await page.route(/\/api\/users\/me(?:\/addresses)?$/, async (route) => {
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().headers()["x-clucky-client"]).toBe("customer");
    if (!refreshed) {
      return route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } });
    }
    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON();
      expect(Object.keys(payload).sort()).toEqual(["fullName", "phone"]);
      profile = { ...profile, ...payload };
      updates++;
    }
    await route.fulfill({ json: route.request().url().endsWith("/addresses") ? [] : profile });
  });
  await page.goto("http://127.0.0.1:4174/account");
  const fullName = page.getByRole("textbox", { name: /Họ và tên|Full name/ });
  await expect(fullName).toHaveValue("Profile Customer");
  expect(refreshes).toBe(1);
  await fullName.fill("Updated Customer");
  await page.getByRole("button", { name: /Lưu thay đổi|Save changes/ }).click();
  await expect.poll(() => updates).toBe(1);
  await expect(page.locator("[data-sonner-toast]")).toBeVisible();
  expect(profile.fullName).toBe("Updated Customer");
});
