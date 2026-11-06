import { test, expect } from "@playwright/test";

test("profile loads after a shared refresh and persists an allowed update", async ({ page }) => {
  let refreshes = 0;
  let updates = 0;
  let profile = { id: 7, fullName: "Profile Customer", email: "customer@example.com", phone: "0901234567", role: "CUSTOMER" };
  await page.addInitScript(() => localStorage.setItem("clucky_access_token", "expired"));
  await page.route("**/api/auth/refresh", async (route) => {
    refreshes++;
    expect(route.request().headers().authorization).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({ json: { accessToken: "fresh" } });
  });
  await page.route(/\/api\/users\/me(?:\/addresses)?$/, async (route) => {
    if (route.request().headers().authorization !== "Bearer fresh") {
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
  await expect(page.getByRole("status")).toBeVisible();
  expect(profile.fullName).toBe("Updated Customer");
});
