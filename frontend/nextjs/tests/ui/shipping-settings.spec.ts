import { test, expect, type Page } from "@playwright/test";

async function openStores(page: Page, role: "ADMIN" | "STORE_MANAGER" = "ADMIN") {
  let store = {
    id: 1, name: "Regression Branch 1", address: "Test address", district: "Test district",
    city: "Test city", phone: "0900000000", openTime: "08:00", closeTime: "22:00",
    status: "OPEN", deliveryArea: "Test area", latitude: 10.76, longitude: 106.66,
    deliveryRadiusKm: null as number | null, version: 0,
  };
  let policy: { fee: number | null; version: number } = { fee: null, version: 0 };
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "PUT") writes.push({ path, body: request.postDataJSON() });
    if (path === "/api/auth/session") {
      return route.fulfill({ json: { userId: 2, role, storeId: 1, fullName: "Regression Admin" } });
    }
    if (path === "/api/stores") {
      return route.fulfill({ json: [store, { ...store, id: 2, name: "Regression Branch 2" }] });
    }
    if (path === "/api/shipping/config") {
      if (request.method() === "PUT") policy = { fee: request.postDataJSON().fee, version: policy.version + 1 };
      return route.fulfill({ json: policy });
    }
    if (path === "/api/stores/1/delivery-settings") {
      store = { ...store, deliveryRadiusKm: request.postDataJSON().radiusKm, version: store.version + 1 };
      return route.fulfill({ json: store });
    }
    if (path === "/api/stores/1") return route.fulfill({ json: store });
    return route.fulfill({ json: [] });
  });
  await page.goto("http://127.0.0.1:4173/admin/stores");
  await expect(page.getByRole("row").filter({ hasText: "Regression Branch 1" })).toBeVisible();
  return { writes, errors };
}

test("shipping fee button keeps disabled, hover and enabled colors distinct", async ({ page }, testInfo) => {
  const { writes, errors } = await openStores(page);
  await page.getByRole("button", { name: "Phí giao hàng", exact: true }).click();
  const save = page.getByRole("button", { name: "Lưu phí ship", exact: true });
  await expect(save).toBeDisabled();
  await expect(save).not.toHaveCSS("background-color", "rgb(143, 18, 22)");
  const disabledBackground = await save.evaluate(element => getComputedStyle(element).backgroundColor);
  await save.hover({ force: true });
  await expect(save).toHaveCSS("background-color", disabledBackground);
  await page.screenshot({ path: testInfo.outputPath("fee-disabled.png"), fullPage: true });

  await page.getByLabel("Phí cố định (VND)").fill("20000");
  await page.mouse.move(0, 0);
  await expect(save).toBeEnabled();
  await expect(save).toHaveCSS("background-color", "rgb(143, 18, 22)");
  await expect(save).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.screenshot({ path: testInfo.outputPath("fee-enabled.png"), fullPage: true });
  await save.click();
  await expect.poll(() => writes).toEqual([{ path: "/api/shipping/config", body: { fee: 20000, version: 0 } }]);
  await expect(page.getByText("Đã lưu cấu hình giao hàng.", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const role of ["ADMIN", "STORE_MANAGER"] as const) {
  test(`${role} edits the branch radius inside a white modal`, async ({ page }, testInfo) => {
    const { writes, errors } = await openStores(page, role);
    await expect(page.getByLabel("Bán kính (km)")).toHaveCount(0);
    if (role === "STORE_MANAGER") {
      await expect(page.getByText("Phí giao hàng toàn chuỗi", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("row").filter({ hasText: "Regression Branch 2" })).toHaveCount(0);
    }
    const row = page.getByRole("row").filter({ hasText: "Regression Branch 1" });
    async function openRadius() {
      if (role === "ADMIN") {
        await row.getByRole("button", { name: "Thao tác khác cho Regression Branch 1", exact: true }).click();
        await page.getByRole("menuitem", { name: "Phạm vi giao hàng", exact: true }).click();
      } else await row.getByRole("button", { name: "Chỉnh sửa chi nhánh", exact: true }).click();
    }
    await openRadius();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    for (const selector of [".ant-modal-container", ".ant-modal-header", ".ant-modal-body", ...(role === "STORE_MANAGER" ? [".ant-modal-footer"] : [])]) {
      await expect(dialog.locator(selector)).toHaveCSS("background-color", "rgb(255, 255, 255)");
    }
    const radius = dialog.getByLabel("Bán kính (km)");
    await expect(radius).toBeEnabled();
    await radius.fill("5.5");
    await dialog.getByRole("button", { name: "Lưu bán kính", exact: true }).click();
    await expect.poll(() => writes).toEqual([{ path: "/api/stores/1/delivery-settings", body: { radiusKm: 5.5, version: 0 } }]);
    await expect(dialog.getByText("Bán kính hiện tại: 5.5 km", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("branch-radius.png"), fullPage: true });
    await dialog.locator(".ant-modal-close").click();
    await expect(dialog).toHaveCount(0);
    await openRadius();
    await expect(dialog.getByLabel("Bán kính (km)")).toHaveValue("5.50");
    expect(errors).toEqual([]);
  });
}
