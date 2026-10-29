import { test, expect, type Page } from "@playwright/test";

const customer = "http://127.0.0.1:4174";
const admin = "http://127.0.0.1:4173";
const fixture = "http://127.0.0.1:4175/loading.html";
const overlay = (page: Page) => page.locator("[data-page-loader]");

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
    page.getByRole("button", { name: /Mở giỏ hàng nhanh/ }),
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
      page.getByRole("button", { name: /Mở giỏ hàng nhanh/ }),
    ).toBeVisible();
    await page
      .locator('nav[aria-label="Điều hướng chính"] a[href="/stores"]')
      .click();
    await expect(overlay(page)).toBeVisible();
    await expect(overlay(page).getByRole("status")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /Mở giỏ hàng nhanh/ }),
    ).toHaveCount(0);
    release();
    await expect(
      page.getByRole("heading", { name: "Hệ thống Cửa hàng Clucky" }),
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
      page.getByRole("button", { name: /Mở giỏ hàng nhanh/ }),
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
  await page.goto(customer + "/");
  const category = page.locator('a[href^="/menu?cat="]').first();
  await category.click();
  await expect(page).toHaveURL(/\/menu\?cat=/);
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
    page.getByRole("button", { name: /Mở giỏ hàng nhanh/ }),
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
    const toggle = page.locator("header button[aria-controls]");
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

test("admin initial Users request is page-scoped; refresh remains local", async ({
  page,
}) => {
  let release!: () => void;
  let gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const users = [
    {
      id: 1,
      fullName: "Khách kiểm thử",
      email: "test@clucky.local",
      phone: "0900000000",
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  ];
  await page.route("**/api/users", async (route) => {
    await gate;
    await route.fulfill({ json: users }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await expect(overlay(page)).toBeVisible();
    release();
    await expect(page.getByText("test@clucky.local")).toBeVisible();
    await expect(overlay(page)).toHaveCount(0);
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await observeLoading(page);
    await page.getByRole("button", { name: "Làm mới danh sách" }).click();
    await expect(
      page.getByRole("status", { name: "Đang tải dữ liệu" }),
    ).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute(
      "data-loader-seen",
      "false",
    );
    release();
    await expect(page.getByText("test@clucky.local")).toBeVisible();
  } finally {
    release();
  }
});

test("admin can leave pending Users; a late response cannot relock the new route", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/users", async (route) => {
    await gate;
    await route.fulfill({ json: [] }).catch(() => {});
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
  } finally {
    release();
  }
});

test("admin Users errors settle into the existing fallback, not an endless loader", async ({
  page,
}) => {
  await page.route("**/api/users", (route) =>
    route.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.goto(admin + "/admin/users");
  await expect(page.getByText("Dữ liệu mẫu", { exact: true })).toBeVisible();
  await expect(overlay(page)).toHaveCount(0);
});

test("admin role change invalidates a pending Users request", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/users", async (route) => {
    await gate;
    await route
      .fulfill({
        json: [
          {
            id: 99,
            fullName: "Old request",
            email: "stale@clucky.test",
            role: "CUSTOMER",
            status: "ACTIVE",
          },
        ],
      })
      .catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await expect(overlay(page)).toBeVisible();
    await page.locator(".admin-header-role").click();
    await page
      .locator(".ant-select-item-option-content")
      .filter({ hasText: "Role: Staff Chi nhánh" })
      .click();
    await expect(page.getByText("403 — Không có quyền truy cập")).toBeVisible();
    release();
    await expect(overlay(page)).toHaveCount(0);
    await expect(page.getByText("stale@clucky.test")).toHaveCount(0);
  } finally {
    release();
  }
});

test("admin modal action keeps loading local and cannot be dismissed mid-request", async ({
  page,
}) => {
  const user = {
    id: 99,
    fullName: "Khách kiểm thử",
    email: "test@clucky.local",
    role: "CUSTOMER",
    status: "ACTIVE",
  };
  await page.route("**/api/users", (route) => route.fulfill({ json: [user] }));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/users/99/lock", async (route) => {
    await gate;
    await route.fulfill({ json: {} }).catch(() => {});
  });
  try {
    await page.goto(admin + "/admin/users");
    await page.getByRole("button", { name: "Khóa", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Khóa tài khoản", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Hủy bỏ", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(overlay(page)).toHaveCount(0);
    release();
    await expect(dialog).toHaveCount(0);
  } finally {
    release();
  }
});

for (const app of [customer, admin]) {
  test(`leaving a completed forgot-password form cancels its delayed redirect: ${app}`, async ({
    page,
  }) => {
    await page.route("**/api/auth/forgot-password", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.goto(app + "/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill("test@clucky.local");
    await page.clock.install();
    await page
      .getByRole("button", { name: "Gửi mã đặt lại", exact: true })
      .click();
    await expect(page.getByText(/Nếu email tồn tại/)).toBeVisible();
    await page.getByRole("link", { name: /Quay lại đăng nhập/ }).click();
    await expect(page).toHaveURL(app + "/login");
    await page.clock.runFor(1500);
    await expect(page).toHaveURL(app + "/login");
    await expect(overlay(page)).toHaveCount(0);
  });
}

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
    await page.addInitScript(
      (role) => localStorage.setItem("clucky_admin_role", role),
      role,
    );
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
