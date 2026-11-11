import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedOrder } from "../fixtures/order";

const admin = "http://127.0.0.1:4173";
const customer = "http://127.0.0.1:4174";
const fixture = "http://127.0.0.1:4175";
const customerSession = { userId: 1, role: "CUSTOMER", fullName: "Customer", email: "customer@example.com" };
const adminSession = { userId: 2, role: "ADMIN", fullName: "Admin", email: "admin@example.com" };
const bankInfo = { bankName: "MBBank", bankCode: "MB", accountNo: "0001234567", accountName: "CLUCKY TEST" };

async function seedPayments(page: Page) {
  await page.route("**/api/payments/bank-config", route => route.fulfill({ json: {
    accounts: [{ id: 1, ...bankInfo, active: true, version: 0 }],
    assignments: [{ storeId: 1, bankAccountId: 1, version: 0 }],
    sepayKeyConfigured: true, reconciliationAvailable: true,
  } }));
  await page.route("**/api/payments/transactions?*", route => route.fulfill({ json: {
    page: { content: [], page: 0, size: 20, totalElements: 0 }, lastReceivedAt: null,
  } }));
  await page.route("**/api/stores?*", route => route.fulfill({ json: [{ id: 1, name: "Clucky Test", status: "OPEN" }] }));
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", route => route.fulfill({
    json: route.request().headers()["x-clucky-client"] === "admin" ? adminSession : customerSession,
  }));
});

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
      details: v.nodes.map((n) => n.failureSummary),
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

test("Google password step validates and never persists session tokens", async ({
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
      json: customerSession,
    });
  });
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.getByLabel("Mật khẩu mới")).toBeFocused();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toHaveText(
    "Mật khẩu phải có ít nhất 8 ký tự.",
  );
  await page.getByLabel("Mật khẩu mới").fill("Password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("different");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toHaveText(
    "Mật khẩu nhập lại không khớp.",
  );
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-destination",
    "/",
  );
  expect(submitted).toEqual({
    pendingToken: "pending-test",
    password: "Password123",
  });
  expect(
    await page.evaluate(() => localStorage.getItem("clucky_access_token")),
  ).toBeNull();
});

for (const registration of [false, true]) {
  test(`Google ${registration ? "registration" : "login"} survives the guest-to-user session update and goes home`, async ({ page }) => {
    await page.route("**/api/auth/session", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
    await page.route("**/api/auth/refresh", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
    await page.route("**/api/auth/google", route => route.fulfill({
      json: registration ? { status: "REQUIRES_PASSWORD", pendingToken: "p".repeat(43) } : customerSession,
    }));
    await page.route("**/api/auth/google/complete", route => route.fulfill({ json: customerSession }));
    const bootstrap = page.waitForResponse("**/api/auth/refresh");
    await page.goto(fixture);
    await bootstrap;
    await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
    if (registration) {
      await page.getByLabel("Mật khẩu mới").fill("Password123");
      await page.getByLabel("Nhập lại mật khẩu").fill("Password123");
      await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
    }
    await expect(page.locator("body")).toHaveAttribute("data-destination", "/");
  });
}

test("Google sign-in preserves a safe checkout redirect", async ({ page }) => {
  await page.route("**/api/auth/google", route => route.fulfill({ json: customerSession }));
  await page.goto(fixture + "?redirect=%2Fcheckout");
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/checkout");
});

test("Google existing account, cancellation and expired pending session", async ({
  page,
}) => {
  await page.route("**/api/auth/google", (route) =>
    route.fulfill({
      json: customerSession,
    }),
  );
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-destination",
    "/",
  );
  await page.goto(fixture + "?cancel");
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toContainText("đóng đăng nhập Google");
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
  await page.getByLabel("Mật khẩu mới").fill("Password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toContainText("hết hạn");
  await expect(
    page.getByRole("button", { name: "Đăng nhập bằng Google" }),
  ).toBeEnabled();
});

test("Google registration failure restarts safely and never stores pending tokens", async ({ page }) => {
  await page.route("**/api/auth/google", (route) => route.fulfill({
    json: { status: "REQUIRES_PASSWORD", pendingToken: "p".repeat(43) },
  }));
  await page.route("**/api/auth/google/complete", (route) => route.fulfill({
    status: 409, json: { code: "EMAIL_EXISTS" },
  }));
  await page.goto(fixture);
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await page.getByLabel("Mật khẩu mới").fill("lowercase123");
  await page.getByLabel("Nhập lại mật khẩu").fill("lowercase123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toContainText("chữ hoa");
  await page.getByLabel("Mật khẩu mới").fill("Password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toContainText("Hãy đăng nhập Google lại");
  await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("clucky_access_token"))).toBeNull();
  await page.route("**/api/auth/google", (route) => route.fulfill({ json: customerSession }));
  await page.getByRole("button", { name: "Đăng nhập bằng Google" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/");
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes("token")))).toEqual([]);
});

for (const role of ["ADMIN", "STORE_MANAGER", "STAFF"]) {
  test(`payment screens enforce role scope: ${role}`, async ({ page }) => {
    await page.route("**/api/auth/session", route => route.fulfill({ json: { ...adminSession, role, storeId: role === "ADMIN" ? null : 1 } }));
    await seedPayments(page);
    const mutations: string[] = [];
    const paymentReads: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) mutations.push(request.url());
      if (new URL(request.url()).pathname.startsWith("/api/payments/") && request.method() === "GET") paymentReads.push(new URL(request.url()).pathname);
    });
    await page.goto(admin + "/admin/payments");
    if (role === "ADMIN") {
      await expect(page.getByRole("tab", { name: "Giao dịch", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("button", { name: "Thêm tài khoản", exact: true })).toBeHidden();
      await page.getByRole("tab", { name: "Tài khoản nhận tiền", exact: true }).click();
      await expect(page.getByRole("button", { name: "Thêm tài khoản", exact: true })).toBeEnabled();
      await expect(page.getByRole("region", { name: "Tài khoản nhận tiền", exact: true }).getByRole("row").filter({ hasText: bankInfo.accountNo })).toContainText(bankInfo.accountName);
      expect(paymentReads).toEqual(expect.arrayContaining(["/api/payments/bank-config", "/api/payments/transactions"]));
    }
    if (role !== "ADMIN") {
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Nhật ký thanh toán", exact: true })).toBeVisible();
      await expect(page.getByRole("spinbutton", { name: "ID đơn hàng", exact: true })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "Tài khoản nhận tiền", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Thêm tài khoản", exact: true })).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: "Chi nhánh", exact: true })).toHaveCount(0);
      expect(paymentReads).toEqual(["/api/payments/transactions"]);
    }
    await expect(page.locator("body")).not.toContainText(/CLUCKY-241026|MB-20261026/);
    expect(mutations).toEqual([]);
  });
}

for (const width of [320, 375, 768, 1440]) {
  test(`responsive payment/shipping and admin ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await seedPayments(page);
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
    await expect(page.getByRole("tab", { name: "Giao dịch", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoOverflow(page);
    const transactions = page.getByRole("region", { name: "Giao dịch", exact: true });
    await transactions.focus();
    await expect(transactions).toBeFocused();
    if (width < 900) {
      await transactions.press("ArrowRight");
      await expect.poll(() => transactions.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    await page.screenshot({
      path: testInfo.outputPath("admin-payments.png"),
      fullPage: true,
    });
    await a11y(page, "main");
    const transactionsTab = page.getByRole("tab", { name: "Giao dịch", exact: true });
    await transactionsTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Thu tiền \/ đối soát \/ legacy$/ })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Hoàn tiền$/ })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    const accountsTab = page.getByRole("tab", { name: /Tài khoản nhận tiền$/ });
    await expect(accountsTab).toBeFocused();
    await expect(accountsTab).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(accountsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: "Tài khoản nhận tiền", exact: true }).getByRole("row").filter({ hasText: bankInfo.accountNo })).toBeVisible();
    await expectNoOverflow(page);
    await a11y(page, "main");
    await page.screenshot({ path: testInfo.outputPath("admin-bank-accounts.png"), fullPage: true });
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
  const order = await seedOrder(page);
  const paymentReference = "CLUCKY001XA1B2C3";
  const expiresAt = new Date(Date.now() + 600000).toISOString();
  await page.route("**/api/payments/901", route => route.fulfill({ json: {
    orderId: 901, status: order.status === "CANCELLED" ? "CANCELLED" : order.paymentStatus === "PAID" ? "PAID" : "PENDING",
    reference: paymentReference, expiresAt, bankInfo, amount: "262000",
    receivedAmount: order.paymentStatus === "PAID" ? "262000" : "0",
    missingAmount: order.paymentStatus === "PAID" ? "0" : "262000",
    excessAmount: "0", confirmationPending: false, closedReason: null,
    canTransfer: order.status === "PENDING_PAYMENT" && order.paymentStatus === "PENDING",
  } }));
  const qr = page.getByRole("img", { name: `VietQR thanh toán đơn ${paymentReference}` });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.route("https://vietqr.app/img?*", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/></svg>' }));
  await page.goto(customer + "/orders/901");
  await expect(page.getByText("Đã tạo phiếu giao", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Thông tin giao hàng" }),
  ).toBeVisible();
  await expect(qr).toHaveCount(0);
  order.status = "PENDING_PAYMENT";
  order.paymentStatus = "PENDING";
  order.createdAt = new Date().toISOString();
  delete order.shipmentStatus;
  await page.reload();
  await expect(page.getByText("Đã tạo phiếu giao", { exact: true })).toHaveCount(0);
  await expect(qr).toBeVisible();
  const qrUrl = new URL((await qr.getAttribute("src"))!);
  expect(qrUrl.origin + qrUrl.pathname).toBe("https://vietqr.app/img");
  expect(qrUrl.searchParams.get("amount")).toBe("262000");
  expect(qrUrl.searchParams.get("des")).toBe(paymentReference);
  expect(qrUrl.searchParams.get("acc")).toBe(bankInfo.accountNo);
  expect(qrUrl.searchParams.get("bank")).toBe(bankInfo.bankCode);
  await expect(page.getByText("Phí giao hàng", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Điều khiển tiến trình đơn hàng" })).not.toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("order-payment-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Hủy đơn hàng này" }).click();
  await page.getByLabel("Lý do hủy *").fill("Kiểm tra UI");
  await page.getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
  await expect(page.getByText("Đơn đã được hủy thành công.")).toBeVisible();
  await expect(qr).toHaveCount(0);
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
  await expect(page.locator("[data-sonner-toast] [data-description]").first()).toHaveText("Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.");
  await expect(
    page.getByRole("button", { name: "Đăng nhập bằng Google" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
