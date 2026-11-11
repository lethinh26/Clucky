import { test, expect, type Page } from "@playwright/test";
import { seedOrder } from "../fixtures/order";
import { seedApi } from "../fixtures/api";

const customer = "http://127.0.0.1:4174";
const admin = "http://127.0.0.1:4173";

test.beforeEach(async ({ page }) => {
  await seedApi(page);
});

async function switchLanguage(page: Page, locale: "vi" | "en") {
  const dialog = page.getByRole("dialog");
  const scope = await dialog.isVisible() ? dialog : page;
  const currentLocale = await page.locator("html").getAttribute("lang");
  const control = scope.getByRole("combobox", { name: /^(Ngôn ngữ|Language)(:|$)/ });
  await control.focus();
  await control.press("ArrowDown");
  const option = page.getByRole("option", { name: locale === "vi" ? /^Tiếng Việt/ : /^English/ });
  await expect(option).toBeVisible();
  if (page.url().startsWith(admin)) {
    if (currentLocale !== locale) await control.press(locale === "en" ? "ArrowDown" : "ArrowUp");
    await control.press("Enter");
  } else {
    await option.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  const selector = scope.getByRole("combobox", { name: locale === "en" ? /^Language/ : /^Ngôn ngữ/ });
  await expect(selector).toHaveAttribute("aria-expanded", "false", { timeout: 15000 });
  await expect(selector).toBeEnabled({ timeout: 15000 });
}

for (const origin of [customer, admin]) {
  test(`custom language dropdown supports keyboard dismissal (${origin})`, async ({ page }) => {
    await page.goto(origin + "/login");
    const selector = page.getByRole("combobox", { name: /^Ngôn ngữ/ });
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

test("customer account navigation resets scroll, including clicking the current page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto(customer + "/account");
  await expect(page.getByRole("textbox", { name: "Họ và tên", exact: true })).toHaveValue("Test User");
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.getByRole("banner").getByRole("link", { name: "Tài khoản", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "instant" }));
  await page.getByRole("banner").getByRole("link", { name: "Thực đơn", exact: true }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/account$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("account dashboard fits narrow screens and displays the real profile", async ({ page }) => {
  await page.goto(customer + "/account");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Test User");
    await expect(page.getByText(/Thông tin liên hệ và địa chỉ ở đây là bản mẫu/)).toHaveCount(0);
    await page.getByRole("navigation", { name: "Quản lý tài khoản" }).getByRole("button", { name: "Sổ địa chỉ", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chưa có địa chỉ nào" })).toBeVisible();
  }
});

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
  await expect(page.locator("[data-sonner-toast] [data-description]").filter({ hasText: "The passwords do not match." })).toBeVisible();
  await switchLanguage(page, "vi");
  await expect(page.locator("[data-sonner-toast] [data-description]").filter({ hasText: "Mật khẩu xác nhận không khớp." })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true }).filter({ visible: true })).toHaveValue("new-password");
  await switchLanguage(page, "en");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("cart quantities, user notes and VND survive language changes and reload", async ({ page }) => {
  await page.route("**/api/cart", route => route.fulfill({ json: {
    items: [{ itemKey: "locale-test", productId: 1, itemName: "Gà rán tên gốc", unitPrice: 125000, quantity: 2,
      lineTotal: 250000, note: "Không dịch ghi chú của tôi" }],
    subtotal: 250000, itemCount: 2,
  } }));
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
    const email = page.getByRole("textbox", { name: origin === admin ? "Định danh nội bộ hoặc email Admin" : "Email", exact: true });
    await expect(email).toHaveCount(1);
    await email.fill("locale@example.com");
    await page.getByLabel("Mật khẩu", { exact: true }).filter({ visible: true }).fill("password123");
    await page.getByRole("button", { name: /Đăng nhập$/, exact: false }).first().click();
    await expect(page.locator("[data-sonner-toast] [data-description]").filter({ hasText: "Bạn không có quyền" })).toBeVisible();
    await switchLanguage(page, "en");
    await expect(page.getByRole("textbox", { name: origin === admin ? "Internal login or Admin email" : "Email", exact: true })).toHaveValue("locale@example.com");
    await expect(page.getByLabel("Password", { exact: true }).filter({ visible: true })).toHaveValue("password123");
    await expect(page.locator("[data-sonner-toast] [data-description]").filter({ hasText: "You do not have permission" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("secret SQL diagnostic");
  });
}

test("admin filters and an open form survive language changes", async ({ page }) => {
  await page.route("**/api/catalog/**", route => route.fulfill({ json: [] }));
  await page.goto(admin + "/admin/catalog");
  await page.getByRole("textbox", { name: "Tìm kiếm thực đơn" }).fill("Gà");
  await page.getByRole("button", { name: "Thêm món ăn", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Tên món", { exact: true }).fill("Tên món tự nhập");
  await switchLanguage(page, "en");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Dish name", { exact: true })).toHaveValue("Tên món tự nhập");
  const selector = dialog.getByRole("combobox", { name: /^Language:/ });
  await selector.focus();
  await selector.press("ArrowDown");
  await expect(selector).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(selector).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search menu" })).toHaveValue("Gà");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Add dish", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/i18n-admin-catalog-en.png", fullPage: true });
});

for (const [origin, routes] of [
  [customer, ["/", "/menu", "/menu/ga-ran-truyen-thong", "/account", "/cart", "/checkout", "/orders", "/stores", "/party"]],
  [admin, ["/admin", "/admin/catalog", "/admin/stores", "/admin/inventory", "/admin/orders", "/admin/reviews", "/admin/users", "/admin/reports", "/admin/payments"]],
] as const) {
  test(`English route coverage without missing translations (${origin})`, async ({ page, context }) => {
    test.setTimeout(120000);
    await context.addCookies([{ name: "clucky_locale", value: "en", url: origin }]);
    await page.route("**/api/**", route => new URL(route.request().url()).pathname === "/api/auth/session"
      ? route.fallback() : route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } }));
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
  await page.route("**/api/auth/session", route => route.fulfill({ json: {
    userId: 2, role: "STAFF", storeId: 1, email: "staff@example.com", fullName: "Staff",
  } }));
  await page.goto(admin + "/admin/orders");
  await expect(page.getByRole("heading", { name: "Store orders" })).toBeVisible();
  await page.getByPlaceholder("Order code, name or phone number…").fill("CLUCKY");
  await switchLanguage(page, "vi");
  await expect(page.getByPlaceholder("Mã đơn, tên hoặc số điện thoại…")).toHaveValue("CLUCKY");
  await expect(page.getByRole("heading", { name: "Đơn hàng của chi nhánh" })).toBeVisible();
  await switchLanguage(page, "en");
  await expect(page.getByRole("heading", { name: "Store orders" })).toBeVisible();
  await expect(page.getByPlaceholder("Order code, name or phone number…")).toHaveValue("CLUCKY");
});

test("language selector and navigation fit mobile in both locales", async ({ page }) => {
  await page.route("**/api/auth/session", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.route("**/api/auth/refresh", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.goto(customer + "/cart");
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["vi", "en"] as const) {
      await switchLanguage(page, locale);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.getByRole("button", { name: locale === "vi" ? "Mở điều hướng" : "Open navigation" }).click();
      const navigation = page.getByRole("navigation", { name: locale === "vi" ? "Điều hướng di động" : "Mobile navigation" });
      await expect(navigation.locator('a[href="/account"]')).toHaveCount(0);
      await expect(navigation.getByRole("link", { name: locale === "vi" ? "Đăng nhập" : "Sign in", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
});

test("customer header has a compact flag selector and session-aware account links", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/auth/session", route => route.fulfill(signedIn
    ? { json: { userId: 1, role: "CUSTOMER", email: "test@example.com", fullName: "Test User" } }
    : { status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.route("**/api/auth/refresh", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(customer + "/login");
  const header = page.getByRole("banner");
  await expect(header.locator('a[href="/account"]')).toHaveCount(0);
  const selector = header.getByRole("combobox", { name: "Ngôn ngữ" });
  expect((await selector.boundingBox())!.width).toBeLessThanOrEqual(60);
  await expect(selector).toHaveCSS("border-top-width", "0px");
  const icons = await selector.locator("svg").evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return box.top + box.height / 2;
  }));
  expect(icons).toHaveLength(2);
  expect(Math.abs(icons[0] - icons[1])).toBeLessThanOrEqual(1);
  await expect(selector.locator('svg[viewBox="0 0 30 20"]')).toBeVisible();
  await switchLanguage(page, "en");
  await expect(header.getByRole("combobox", { name: "Language" }).locator('svg[viewBox="0 0 60 40"]')).toBeVisible();
  signedIn = true;
  await page.reload();
  await expect(header.getByRole("link", { name: "Test User", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Account", exact: true })).toBeVisible();
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
  await seedOrder(page);
  await context.addCookies([{ name: "clucky_locale", value: "en", url: customer }]);
  await page.goto(customer + "/orders/901");
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
