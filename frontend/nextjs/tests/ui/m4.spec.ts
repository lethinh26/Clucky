import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const admin = "http://127.0.0.1:4173";
const customer = "http://127.0.0.1:4174";
const fixture = "http://127.0.0.1:4175";

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function a11y(page: Page, selector: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test("customer auth pages show Google; admin does not", async ({ page }) => {
  for (const path of ["/login", "/register"]) {
    await page.goto(customer + path);
    await expect(
      page.getByRole("button", { name: "Đăng nhập bằng Google" }),
    ).toBeVisible();
  }
  await page.goto(admin + "/login");
  await expect(
    page.getByRole("button", { name: "Đăng nhập bằng Google" }),
  ).toHaveCount(0);
});

test("Google password step validates, sends pending token and saves only final JWTs", async ({
  page,
}) => {
  let submitted: unknown;
  await page.route("**/api/auth/google", (route) => {
    expect(route.request().postDataJSON()).toEqual({
      idToken: "test-firebase-id-token",
    });
    return route.fulfill({
      json: { status: "REQUIRES_PASSWORD", pendingToken: "pending-test" },
    });
  });
  await page.route("**/api/auth/google/complete", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({
      json: { accessToken: "jwt-access", refreshToken: "jwt-refresh" },
    });
  });
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.getByLabel("Mật khẩu mới")).toBeFocused();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Mật khẩu phải có ít nhất 8 ký tự.",
  );
  await page.getByLabel("Mật khẩu mới").fill("password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("different");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Mật khẩu nhập lại không khớp.",
  );
  await page.getByLabel("Nhập lại mật khẩu").fill("password123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-destination",
    "/account",
  );
  expect(submitted).toEqual({
    pendingToken: "pending-test",
    password: "password123",
  });
  expect(
    await page.evaluate(() => localStorage.getItem("clucky_access_token")),
  ).toBe("jwt-access");
});

test("Google existing account, cancellation and expired pending session", async ({
  page,
}) => {
  await page.route("**/api/auth/google", (route) =>
    route.fulfill({
      json: { accessToken: "existing", refreshToken: "refresh" },
    }),
  );
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-destination",
    "/account",
  );
  await page.goto(fixture + "?cancel");
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.getByRole("alert")).toContainText("đóng đăng nhập Google");
  await page.route("**/api/auth/google", (route) =>
    route.fulfill({
      json: { status: "REQUIRES_PASSWORD", pendingToken: "expired" },
    }),
  );
  await page.route("**/api/auth/google/complete", (route) =>
    route.fulfill({ status: 401, json: { message: "Expired" } }),
  );
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await page.getByLabel("Mật khẩu mới").fill("password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("password123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.getByRole("alert")).toContainText("hết hạn");
  await expect(
    page.getByRole("button", { name: "Đăng nhập bằng Google" }),
  ).toBeEnabled();
});

test("payment admin confirms with a reason, clears cancelled draft, validates bank account", async ({
  page,
}) => {
  await page.goto(admin + "/admin/payments");
  const row = page.getByRole("row").filter({ hasText: "CLUCKY-241026-102" });
  await row.getByRole("button", { name: "Xác nhận thủ công" }).click();
  await expect(
    page.getByRole("button", { name: "Xác nhận đã nhận tiền" }),
  ).toBeDisabled();
  await page
    .getByLabel("Lý do xác nhận thủ công")
    .fill("Đã kiểm tra sao kê demo");
  await page.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click();
  await expect(row).toContainText("Đã thanh toán");
  await expect(
    page.getByRole("region", { name: "Nhật ký xác nhận trong phiên demo" }),
  ).toContainText("Đã kiểm tra sao kê demo");
  await page.getByRole("button", { name: "Xác nhận thủ công" }).click();
  await page.getByLabel("Lý do xác nhận thủ công").fill("Bản nháp");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Xác nhận thủ công" }).click();
  await expect(page.getByLabel("Lý do xác nhận thủ công")).toHaveValue("");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Tài khoản nhận tiền" }).click();
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Ngân hàng", { exact: true }).fill("Demo Bank");
  await page.getByLabel("Số tài khoản", { exact: true }).fill("invalid");
  await page.getByLabel("Chủ tài khoản", { exact: true }).fill("CLUCKY");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đồng ý", exact: true })
    .click();
  await expect(page.getByText("Số tài khoản chỉ gồm chữ số")).toBeVisible();
});

test("manager sees only own store; staff cannot open payment UI", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("clucky_admin_role", "STORE_MANAGER"),
  );
  await page.goto(admin + "/admin/payments");
  await expect(
    page.getByRole("tab", { name: "Tài khoản nhận tiền" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Webhook log" })).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "CLUCKY-241026-104" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Giao dịch ngân hàng" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "MB-20261026-000123" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "MB-20261027-000214" }),
  ).toHaveCount(0);
  await page.addInitScript(() =>
    localStorage.setItem("clucky_admin_role", "STAFF"),
  );
  await page.goto(admin + "/admin/payments");
  await expect(
    page.getByRole("tab", { name: "Giao dịch thanh toán" }),
  ).toHaveCount(0);
});

for (const width of [320, 375, 768, 1440]) {
  test(`responsive payment/shipping and admin ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/qr.svg", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><rect x="20" y="20" width="60" height="60" fill="black"/></svg>',
      }),
    );
    await page.goto(fixture + "?qr");
    await expect(
      page.getByRole("img", { name: "VietQR thanh toán đơn CLUCKY-TEST-001" }),
    ).toBeVisible();
    await expectNoOverflow(page);
    await a11y(page, "main");
    await page.screenshot({
      path: testInfo.outputPath("payment-shipping.png"),
      fullPage: true,
    });
    await page.goto(admin + "/admin/payments");
    await expect(
      page.getByRole("tab", { name: "Giao dịch thanh toán" }),
    ).toBeVisible();
    await expectNoOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("admin-payments.png"),
      fullPage: true,
    });
    await a11y(page, ".payments-page");
    await page.getByRole("tab", { name: "Tài khoản nhận tiền" }).click();
    await expectNoOverflow(page);
  });
}

test("QR failure, expiry, loading fee and pickup states", async ({ page }) => {
  await page.route("**/qr.svg", (route) => route.abort());
  await page.goto(fixture + "?qr");
  await expect(page.getByRole("alert")).toContainText("Không tải được mã QR");
  await page.goto(fixture + "?qr&expired");
  await expect(page.getByText("Mã QR đã hết hạn")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  await page.goto(fixture + "?qr&missing&loading&pickup");
  await expect(page.getByText("Chưa có thông tin thanh toán.")).toBeVisible();
  await expect(page.getByText("Đang tính…")).toBeVisible();
  await expect(page.getByText("Đã tạo phiếu giao")).toHaveCount(0);
});

test("order detail keeps main order flow and integrates payment/shipment widgets", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(customer + "/orders/demo-clucky");
  await expect(
    page.getByRole("heading", { name: "Thông tin giao hàng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Chuyển khoản VietQR" }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const key = "clucky-order-workspace-v1";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    const order = snapshot.orders.find(
      (entry: { id: string }) => entry.id === "demo-clucky",
    );
    order.status = "PENDING_PAYMENT";
    order.paymentStatus = "PENDING";
    order.createdAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Minh họa QR, không dùng thanh toán" }),
  ).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("order-payment-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Hủy đơn hàng này" }).click();
  await page.getByLabel("Lý do hủy *").fill("Kiểm tra UI");
  await page.getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
  await expect(page.getByText("Đơn đã được hủy thành công.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Chuyển khoản VietQR" }),
  ).toHaveCount(0);
});

test("Google request loading and error can be retried without storing a pending token", async ({
  page,
}) => {
  let release: () => void = () => undefined;
  await page.route("**/api/auth/google", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 503,
      json: { message: "Dịch vụ tạm gián đoạn" },
    });
  });
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(
    page.getByRole("button", { name: "Đang mở Google…" }),
  ).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toHaveText("Dịch vụ tạm gián đoạn");
  await expect(
    page.getByRole("button", { name: "Đăng nhập bằng Google" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
