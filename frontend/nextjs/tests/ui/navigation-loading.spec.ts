import { test, expect, type Page } from "@playwright/test";
import { seedApi, testStore } from "../fixtures/api";

const customer = "http://127.0.0.1:4174";
const admin = "http://127.0.0.1:4173";
const fixture = "http://127.0.0.1:4175/loading.html";
const overlay = (page: Page) => page.locator("[data-page-loader]");

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedApi(page);
});

async function observeLoading(page: Page) {
  await page.evaluate(() => {
    document.body.dataset.loaderSeen = "false";
    new MutationObserver(() => {
      if (
        document.querySelector("[data-page-loader]") &&
        document.body.dataset.loaderSeen !== "true"
      )
        document.body.dataset.loaderSeen = "true";
    }).observe(document.body, { childList: true, subtree: true });
  });
}

async function holdCustomerRoute(page: Page, pathname: string) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === pathname && url.searchParams.has("_rsc")) await gate;
    await route.continue().catch(() => {});
  });
  return release;
}

test("real loading components: a 60ms task never flashes, old completion cannot close B", async ({
  page,
}) => {
  await page.goto(fixture);
  await page.getByRole("button", { name: "Fast 60ms" }).waitFor();
  await page.clock.install();
  await observeLoading(page);
  await page.getByRole("button", { name: "Fast 60ms" }).click();
  await page.clock.runFor(1200);
  await expect(page.locator("body")).toHaveAttribute(
    "data-loader-seen",
    "false",
  );
  await expect(page.locator("[data-loading-region]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "A then B" }).click();
  await page.clock.runFor(450);
  await expect(overlay(page)).toHaveCount(1);
  await expect(page.locator("[data-loading-region]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(overlay(page)).toHaveCount(0);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`loading geometry, shell and reduced motion ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(fixture);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(overlay(page)).toBeVisible();
    for (const position of [0, viewport.height, viewport.height * 2]) {
      await page.evaluate((y) => scrollTo(0, y), position);
      await expect
        .poll(() =>
          overlay(page)
            .getByRole("status")
            .evaluate((element) => {
              const box = element.getBoundingClientRect(),
                vv = visualViewport!;
              return Math.max(
                Math.abs(
                  box.x + box.width / 2 - (vv.offsetLeft + vv.width / 2),
                ),
                Math.abs(
                  box.y + box.height / 2 - (vv.offsetTop + vv.height / 2),
                ),
              );
            }),
        )
        .toBeLessThanOrEqual(4);
    }
    await expect(overlay(page)).toHaveCSS("backdrop-filter", "none");
    const animations = await overlay(page).evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
    expect(animations).toBe(0);
    await page.getByRole("button", { name: "Finish" }).focus();
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("button", { name: "Content action", includeHidden: true })
        .evaluate((node) => document.activeElement === node),
    ).toBe(false);
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(overlay(page)).toHaveCount(0);
  });
}

test("customer history fragment and cancelled link never create navigation work", async ({
  page,
}) => {
  await page.goto(customer + "/menu?q=ga%20ran");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true }),
  ).toBeVisible();
  await observeLoading(page);
  await page.evaluate(() => {
    history.pushState({}, "", "#a");
    history.pushState({}, "", "#b");
    history.back();
  });
  await page.waitForTimeout(1000);
  await expect(page.locator("body")).toHaveAttribute(
    "data-loader-seen",
    "false",
  );
  await page.evaluate(() =>
    document
      .querySelector('nav[aria-label="Điều hướng chính"] a[href="/stores"]')!
      .addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      }),
  );
  await page
    .locator('nav[aria-label="Điều hướng chính"] a[href="/stores"]')
    .click();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/menu/);
  await expect(page.locator("body")).toHaveAttribute(
    "data-loader-seen",
    "false",
  );
});

test("customer real route loading ends with content and cannot reappear", async ({
  page,
}) => {
  const release = await holdCustomerRoute(page, "/stores");
  try {
    await page.goto(customer + "/menu");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true }),
    ).toBeVisible();
    await page
      .locator('nav[aria-label="Điều hướng chính"] a[href="/stores"]')
      .click();
    await expect(overlay(page)).toBeVisible();
    await expect(overlay(page).getByRole("status")).toHaveCount(1);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true }),
    ).toBeVisible();
    release();
    await expect(
      page.getByRole("heading", { name: "Tìm Clucky gần bạn" }),
    ).toBeVisible();
    await expect(overlay(page)).toHaveCount(0);
    await observeLoading(page);
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toHaveAttribute(
      "data-loader-seen",
      "false",
    );
  } finally {
    release();
  }
});

test("customer can replace a pending route through the header", async ({
  page,
}) => {
  const release = await holdCustomerRoute(page, "/stores");
  try {
    await page.goto(customer + "/menu");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", {
      name: "Điều hướng chính",
      exact: true,
    });
    await nav.locator('a[href="/stores"]').click();
    await expect(overlay(page)).toBeVisible();
    await page.evaluate(() => scrollTo(0, 700));
    await nav.locator('a[href="/orders"]').click();
    await expect(page).toHaveURL(customer + "/orders");
    await expect(overlay(page)).toHaveCount(0);
    release();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(customer + "/orders");
  } finally {
    release();
  }
});

test("customer cached route/query history and reload settle without a trailing loader", async ({
  page,
}) => {
  await page.goto(customer + "/menu?q=ga");
  await expect(page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true })).toBeVisible();
  const queryUrl = page.url();
  await expect(overlay(page)).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Điều hướng chính", exact: true })
    .locator('a[href="/menu"]')
    .click();
  await expect(page).toHaveURL(customer + "/menu");
  await page.goBack();
  await expect(page).toHaveURL(queryUrl);
  await expect(page.locator("[data-loading-region]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.goForward();
  await expect(page).toHaveURL(customer + "/menu");
  await expect(page.locator("[data-loading-region]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.reload();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Giỏ hàng", exact: true }),
  ).toBeVisible();
  await observeLoading(page);
  await page.waitForTimeout(1000);
  await expect(page.locator("body")).toHaveAttribute(
    "data-loader-seen",
    "false",
  );
});

test("customer mobile navigation stays above the content loader", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const release = await holdCustomerRoute(page, "/stores");
  try {
    await page.goto(customer + "/menu");
    const toggle = page.getByRole("banner").getByRole("button", { name: /^(Mở|Đóng) điều hướng$/ });
    await toggle.click();
    const mobileNav = page.locator('header nav[data-loading-shell="top"]');
    await mobileNav.locator('a[href="/stores"]').click();
    await expect(overlay(page)).toBeVisible();
    await toggle.click();
    await expect(mobileNav).toBeVisible();
    await mobileNav.locator('a[href="/orders"]').click();
    await expect(page).toHaveURL(customer + "/orders");
    await expect(overlay(page)).toHaveCount(0);
  } finally {
    release();
  }
});

async function seedBranchAccounts(page: Page) {
  await page.route("**/api/stores/1/accounts-status", route => route.fulfill({ json: { readiness: "READY", error: null } }));
  await page.route("**/api/auth/branch/stores/1", route => route.fulfill({ json: {
    storeId: 1, readiness: "READY", recoveryEmail: "branch@clucky.test", verified: true,
    accounts: [{ id: 99, storeId: 1, login: "clucky.staff.1", role: "STAFF", status: "ACTIVE", activated: true, current: true }],
  } }));
}

async function selectBranch(page: Page) {
  await page.getByRole("navigation", { name: "Chọn chi nhánh", exact: true }).getByRole("button", { name: /Clucky Test/ }).click();
}

test("admin initial branch request is page-scoped; background synchronization remains local", async ({ page }) => {
  await seedBranchAccounts(page);
  let release!: () => void;
  let gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/stores?activeOnly=false", async route => {
    await gate;
    await route.fulfill({ json: [testStore] }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await expect(overlay(page)).toBeVisible();
    release();
    await expect(overlay(page)).toHaveCount(0);
    await selectBranch(page);
    await expect(page.getByText("clucky.staff.1", { exact: true })).toBeVisible();
    gate = new Promise<void>(resolve => { release = resolve; });
    let synchronized = false;
    await page.route("**/api/auth/branch/stores/1", async route => {
      synchronized = true;
      await gate;
      await route.fallback().catch(() => {});
    });
    await observeLoading(page);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => synchronized).toBe(true);
    await expect(page.getByRole("button", { name: /Tải lại$/ })).toHaveCount(0);
    await expect(page.locator("body")).toHaveAttribute("data-loader-seen", "false");
    release();
    await expect(overlay(page)).toHaveCount(0);
    await expect(page.getByText("clucky.staff.1", { exact: true })).toBeVisible();
  } finally { release(); }
});

test("admin can leave pending branch request; a late response cannot relock the new route", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/stores?activeOnly=false", async route => {
    await gate;
    await route.fulfill({ json: [testStore] }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await expect(overlay(page)).toBeVisible();
    await page.getByRole("menuitem", { name: /Tổng quan/ }).click();
    await expect(page).toHaveURL(admin + "/admin/dashboard");
    await expect(overlay(page)).toHaveCount(0);
    release();
    await page.waitForTimeout(400);
    await expect(overlay(page)).toHaveCount(0);
  } finally { release(); }
});

test("admin branch errors settle into an explicit error and can be retried without demo data", async ({ page }) => {
  let failed = true;
  await page.route("**/api/stores?activeOnly=false", route => route.fulfill(failed
    ? { status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } } : { json: [testStore] }));
  await page.goto(admin + "/admin/users");
  await expect(page.getByRole("alert")).toContainText("Dịch vụ");
  await expect(page.getByText("Dữ liệu mẫu", { exact: true })).toHaveCount(0);
  await expect(overlay(page)).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await selectBranch(page);
});

test("server session role change invalidates a pending branch request", async ({ page }) => {
  let role = "ADMIN";
  await page.route("**/api/auth/session", route => route.fulfill({ json: { userId: 1, role, storeId: 1, fullName: "Test", email: "test@clucky.test" } }));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/stores?activeOnly=false", async route => {
    await gate;
    await route.fulfill({ json: [{ ...testStore, name: "stale@clucky.test" }] }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await expect(overlay(page)).toBeVisible();
    role = "STAFF";
    await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "clucky-admin-session-change", newValue: "changed" })));
    await expect(page.getByText("403 — Không có quyền truy cập")).toBeVisible();
    release();
    await expect(overlay(page)).toHaveCount(0);
    await expect(page.getByText("stale@clucky.test")).toHaveCount(0);
  } finally { release(); }
});

test("admin modal action keeps loading local and cannot be dismissed mid-request", async ({ page }) => {
  await seedBranchAccounts(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/branch/accounts/99/lock?locked=true", async route => {
    expect(route.request().method()).toBe("PUT");
    await gate;
    await route.fulfill({ json: {} }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await selectBranch(page);
    await page.getByRole("button", { name: "Thao tác tài khoản clucky.staff.1", exact: true }).click();
    await page.getByRole("menuitem", { name: "Khóa tài khoản" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Xác nhận khóa", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Quay lại", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(overlay(page)).toHaveCount(0);
    release();
    await expect(dialog).toHaveCount(0);
  } finally { release(); }
});

for (const app of [customer]) {
  test(`leaving a completed forgot-password form cancels its delayed redirect: ${app}`, async ({
    page,
  }) => {
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.goto(app + "/forgot-password");
    // Next.js can retain a hidden streamed copy of this form during hydration.
    // Role locators target the accessible form instead of its hidden copy.
    const form = page.getByRole("region", {
      name: "Quên mật khẩu",
      exact: true,
    });
    const email = form.getByRole("textbox", { name: "Email", exact: true });
    await expect(email).toHaveCount(1);
    await email.fill("test@clucky.local");
    await expect(email).toHaveValue("test@clucky.local");
    await page.clock.install();
    await form
      .getByRole("button", { name: "Gửi mã đặt lại", exact: true })
      .click();
    await expect(form.getByText(/Nếu email tồn tại/)).toBeVisible();
    await form.getByRole("link", { name: /Quay lại đăng nhập/ }).click();
    await expect(page).toHaveURL(app + "/login");
    await page.clock.runFor(1500);
    await expect(page).toHaveURL(app + "/login");
    await expect(overlay(page)).toHaveCount(0);
  });
}

test("leaving a pending branch recovery challenge cannot replace the login route", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/branch/challenge", async route => {
    expect(route.request().postDataJSON()).toEqual({ login: "clucky.staff.1", purpose: "RESET" });
    await gate;
    await route.fulfill({ json: { challengeId: "00000000-0000-4000-8000-000000000001" } }).catch(() => {});
  });
  try {
    await page.goto(admin + "/forgot-password");
    await page.getByRole("textbox", { name: "Định danh nội bộ hoặc email Admin" }).fill("clucky.staff.1");
    await page.getByRole("button", { name: "Gửi mã", exact: true }).click();
    await expect(page.getByRole("button", { name: /Gửi mã$/ })).toHaveClass(/ant-btn-loading/);
    await page.getByRole("link", { name: "Về đăng nhập" }).click();
    await expect(page).toHaveURL(admin + "/login");
    release();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(admin + "/login");
    await expect(overlay(page)).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Mã challenge (từ email)" })).toHaveCount(0);
  } finally { release(); }
});

// Capture comparable samples for review; hardware-dependent FPS is not a CI gate.
test("capture loading frame timing at rest and while scrolling", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixture);
  const samples = [];
  for (let round = 0; round < 3; round++) {
    for (const phase of ["idle", "loading", "scrolling"] as const) {
      await page
        .getByRole("button", {
          name: phase === "idle" ? "Finish" : "Start",
          exact: true,
        })
        .click();
      if (phase !== "idle") await expect(overlay(page)).toBeVisible();
      const sample = await page.evaluate(async (scrolling) => {
        const deltas: number[] = [],
          longTasks: number[] = [];
        const observer = new PerformanceObserver((list) =>
          list.getEntries().forEach((entry) => longTasks.push(entry.duration)),
        );
        observer.observe({ type: "longtask", buffered: false });
        await new Promise<void>((resolve) => {
          let started = 0,
            previous = 0;
          const tick = (time: number) => {
            if (!started) started = time;
            if (previous) deltas.push(time - previous);
            previous = time;
            if (scrolling) scrollTo(0, (time - started) * 1.5);
            if (time - started < 1000) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        observer.disconnect();
        const sorted = [...deltas].sort((a, b) => a - b);
        return {
          frames: deltas.length,
          fps: (1000 * deltas.length) / deltas.reduce((a, b) => a + b, 0),
          p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
          framesOver34ms: deltas.filter((ms) => ms > 34).length,
          deltas,
          longTasks,
          userAgent: navigator.userAgent,
        };
      }, phase === "scrolling");
      samples.push({ round, phase, ...sample });
      await page.evaluate(() => scrollTo(0, 0));
    }
  }
  await testInfo.attach("loading-performance.json", {
    body: JSON.stringify({ viewport: page.viewportSize(), samples }, null, 2),
    contentType: "application/json",
  });
});

for (const role of ["ADMIN", "STORE_MANAGER", "STAFF"]) {
  test(`admin routes retain role scope and synchronous navigation: ${role}`, async ({
    page,
  }) => {
    await page.route("**/api/auth/session", route => route.fulfill({ json: {
      userId: 1, role, storeId: role === "ADMIN" ? null : 1, fullName: "Test", email: "test@clucky.test",
    } }));
    await page.goto(admin + "/admin/dashboard");
    await observeLoading(page);
    await page.getByRole("menuitem", { name: /Tồn kho Chi nhánh/ }).click();
    await expect(page).toHaveURL(admin + "/admin/inventory");
    await page.waitForTimeout(400);
    await expect(page.locator("body")).toHaveAttribute(
      "data-loader-seen",
      "false",
    );
    if (role === "STAFF") {
      await page.goto(admin + "/admin/users");
      await expect(
        page.getByText("403 — Không có quyền truy cập"),
      ).toBeVisible();
      await expect(overlay(page)).toHaveCount(0);
    }
  });
}
