import { test, expect, type Page } from "@playwright/test";

const customer = "http://127.0.0.1:4174";
const admin = "http://127.0.0.1:4173";

async function switchLanguage(page: Page, locale: "vi" | "en") {
  const dialog = page.getByRole("dialog");
  const scope = await dialog.isVisible() ? dialog : page;
  await scope.getByRole("combobox", { name: /^(Ngôn ngữ|Language)$/ }).click();
  await page.getByRole("option", { name: locale === "vi" ? /^Tiếng Việt/ : /^English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  const selector = scope.getByRole("combobox", { name: locale === "en" ? "Language" : "Ngôn ngữ" });
  await expect(selector).toHaveAttribute("aria-expanded", "false");
  await expect(selector).toBeEnabled();
}

for (const origin of [customer, admin]) {
  test(`custom language dropdown supports keyboard dismissal (${origin})`, async ({ page }) => {
    await page.goto(origin + "/login");
    const selector = page.getByRole("combobox", { name: "Ngôn ngữ" });
    expect(await selector.evaluate(element => element.tagName)).not.toBe("SELECT");
    await selector.focus();
    await selector.press("ArrowDown");
    await expect(selector).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("option", { name: /^Tiếng Việt/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /^English/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(selector).toHaveAttribute("aria-expanded", "false");
    await expect(selector).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });
}

test("customer language changes preserve unsaved form values and translate existing validation", async ({ page }) => {
  await page.goto(customer + "/account");
  const fullName = page.getByRole("textbox", { name: "Họ và tên", exact: true });
  await expect(fullName).toHaveCount(1);
  await fullName.fill("Tên người dùng không dịch");
  await switchLanguage(page, "en");
  await expect(page.getByRole("textbox", { name: "Full name", exact: true })).toHaveValue("Tên người dùng không dịch");
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await page.getByLabel("Current password", { exact: true }).filter({ visible: true }).fill("old-password");
  await page.getByLabel("New password", { exact: true }).filter({ visible: true }).fill("new-password");
  await page.getByLabel("Confirm new password", { exact: true }).filter({ visible: true }).fill("different-password");
  await page.getByRole("button", { name: "Change password (demo)", exact: true }).click();
  await expect(page.locator("main [role=alert]").filter({ visible: true })).toContainText("The passwords do not match.");
  await switchLanguage(page, "vi");
  await expect(page.locator("main [role=alert]").filter({ visible: true })).toContainText("Mật khẩu xác nhận không khớp.");
  await expect(page.getByLabel("Mật khẩu mới", { exact: true }).filter({ visible: true })).toHaveValue("new-password");
  await switchLanguage(page, "en");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("cart quantities, user notes and VND survive language changes and reload", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("clucky-order-workspace-v1")) {
      localStorage.setItem("clucky-order-workspace-v1", JSON.stringify({
        items: [{ id: "locale-test", slug: "ga-ran-truyen-thong", name: "Gà rán tên gốc", category: "Gà rán", basePrice: 125000, unitPrice: 125000, quantity: 2, image: "/logo_primary.png", note: "Không dịch ghi chú của tôi" }],
        orders: [],
      }));
    }
  });
  await page.goto(customer + "/cart");
  const before = await page.evaluate(() => localStorage.getItem("clucky-order-workspace-v1"));
  await switchLanguage(page, "en");
  await expect(page.getByRole("heading", { name: /^Your cart/ })).toBeVisible();
  await expect(page.getByLabel("Notes for Gà rán tên gốc")).toHaveValue("Không dịch ghi chú của tôi");
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(250000);
  await expect(page.locator("main")).toContainText(money);
  expect(await page.evaluate(() => localStorage.getItem("clucky-order-workspace-v1"))).toBe(before);
  await page.reload();
  await expect(page.getByRole("heading", { name: /^Your cart/ })).toBeVisible();
  await expect(page.getByLabel("Notes for Gà rán tên gốc")).toHaveValue("Không dịch ghi chú của tôi");
  expect(await page.evaluate(() => localStorage.getItem("clucky-order-workspace-v1"))).toBe(before);
  await page.screenshot({ path: "test-results/i18n-customer-cart-en.png", fullPage: true });
});

for (const origin of [customer, admin]) {
  test(`safe API errors retranslate without clearing login fields (${origin})`, async ({ page }) => {
    await page.route("**/api/auth/login", route => route.fulfill({ status: 403, json: { code: "FORBIDDEN", message: "secret SQL diagnostic" } }));
    await page.goto(origin + "/login");
    const email = page.getByRole("textbox", { name: "Email", exact: true });
    await expect(email).toHaveCount(1);
    await email.fill("locale@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).filter({ visible: true }).fill("password123");
    await page.getByRole("button", { name: /Đăng nhập$/, exact: false }).first().click();
    await expect(page.locator("main [role=alert]").filter({ visible: true }).last()).toContainText("Bạn không có quyền");
    await switchLanguage(page, "en");
    await expect(email).toHaveValue("locale@example.com");
    await expect(page.getByLabel("Password", { exact: true }).filter({ visible: true })).toHaveValue("password123");
    await expect(page.locator("main [role=alert]").filter({ visible: true }).last()).toContainText("You do not have permission");
    await expect(page.locator("body")).not.toContainText("secret SQL diagnostic");
  });
}

test("admin filters and an open form survive language changes", async ({ page }) => {
  await page.goto(admin + "/admin/catalog");
  await page.getByPlaceholder("Tìm kiếm tên món, slug, danh mục...").fill("Gà");
  await page.getByRole("button", { name: "Thêm món ăn mới" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Tên món ăn", exact: true }).fill("Tên món tự nhập");
  await switchLanguage(page, "en");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Dish name", exact: true })).toHaveValue("Tên món tự nhập");
  const selector = dialog.getByRole("combobox", { name: "Language" });
  await selector.focus();
  await selector.press("ArrowDown");
  await expect(selector).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(selector).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();
  await expect(page.getByPlaceholder("Search dish names, slugs, categories...")).toHaveValue("Gà");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Add a new dish" })).toBeVisible();
  await page.screenshot({ path: "test-results/i18n-admin-catalog-en.png", fullPage: true });
});

for (const [origin, routes] of [
  [customer, ["/", "/menu", "/menu/ga-ran-truyen-thong", "/account", "/cart", "/checkout", "/orders", "/stores", "/party"]],
  [admin, ["/admin", "/admin/catalog", "/admin/stores", "/admin/inventory", "/admin/orders", "/admin/reviews", "/admin/users", "/admin/reports", "/admin/payments"]],
] as const) {
  test(`English route coverage without missing translations (${origin})`, async ({ page, context }) => {
    test.setTimeout(120000);
    await context.addCookies([{ name: "clucky_locale", value: "en", url: origin }]);
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } }));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (/MISSING_MESSAGE|INVALID_MESSAGE|FORMATTING_ERROR|IntlError/.test(message.text())) errors.push(message.text());
    });
    for (const route of routes) {
      await page.goto(origin + route);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await switchLanguage(page, "vi");
      await switchLanguage(page, "en");
      await expect(page.locator("body")).not.toContainText(/\b(?:business|auth|common|admin)[.:][a-z][\w.]+/);
      await expect(page.locator("body")).not.toContainText(/\{\{?value\d+\}\}?/);
      expect(errors, route).toEqual([]);
    }
  });
}

test("staff order labels update without resetting filters", async ({ page, context }) => {
  await context.addCookies([{ name: "clucky_locale", value: "en", url: admin }]);
  await page.addInitScript(() => localStorage.setItem("clucky_admin_role", "STAFF"));
  await page.goto(admin + "/admin/staff/orders");
  await expect(page.getByRole("heading", { name: "Store orders" })).toBeVisible();
  await page.getByPlaceholder("Order code, name or phone number…").fill("CLUCKY");
  await switchLanguage(page, "vi");
  await expect(page.getByPlaceholder("Mã đơn, tên hoặc số điện thoại…")).toHaveValue("CLUCKY");
  await expect(page.getByRole("heading", { name: "Đơn hàng của chi nhánh" })).toBeVisible();
  await switchLanguage(page, "en");
  await expect(page.getByRole("heading", { name: "Store orders" })).toBeVisible();
});

test("language selector and navigation fit mobile in both locales", async ({ page }) => {
  await page.goto(customer + "/cart");
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["vi", "en"] as const) {
      await switchLanguage(page, locale);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole("button", { name: locale === "vi" ? "Mở điều hướng" : "Open navigation" }).click();
      const navigation = page.getByRole("navigation", { name: locale === "vi" ? "Điều hướng di động" : "Mobile navigation" });
      await expect(navigation.getByRole("link", { name: locale === "vi" ? "Đăng nhập" : "Sign in", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
});

test("party prices follow locale without translating package names", async ({ page }) => {
  await page.goto(customer + "/party");
  for (const locale of ["vi", "en"] as const) {
    await switchLanguage(page, locale);
    const money = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(1290000);
    const card = page.getByRole("button", { name: /Tiệc Sinh Nhật Vui Vẻ/ });
    await expect(card).toContainText(money);
  }
});

test("order timestamps use Vietnam time in both languages without translating customer data", async ({ page, context }) => {
  await context.addCookies([{ name: "clucky_locale", value: "en", url: customer }]);
  await page.goto(customer + "/orders/demo-clucky");
  for (const locale of ["en", "vi"] as const) {
    await switchLanguage(page, locale);
    const date = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date("2026-10-28T10:15:00+07:00"));
    await expect(page.locator("main")).toContainText(date);
    await expect(page.locator("main")).toContainText("Trần Đức Anh");
    await expect(page.locator("main")).toContainText("Giao lên tầng 3 phòng lab giúp em");
  }
});
