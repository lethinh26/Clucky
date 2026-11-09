import { test, expect } from "@playwright/test";

const customer = "http://127.0.0.1:4174";

test("cart preserves combo/options and server keys; failed mutations keep the cart", async ({ page }) => {
  const items: any[] = [];
  let signedIn = false;
  await page.route("**/api/auth/session", route => route.fulfill(signedIn
    ? { json: { userId: 7, role: "CUSTOMER", fullName: "Customer", email: "customer@example.com" } }
    : { status: 401, json: { code: "UNAUTHENTICATED" } }));
  await page.route("**/api/auth/refresh", route => route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }));
  const additions: any[] = [];
  const mutationKeys: string[] = [];
  let rejectUpdate = false;
  const response = () => ({ items, itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.quantity * item.unitPrice, 0) });
  await page.route(/\/api\/cart(?:\/|$)/, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/cart/merge") return route.fulfill({ json: response() });
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      additions.push(body);
      items.push({ ...body, itemKey: `server-key-${items.length + 1}`, comboId: body.comboId ?? null, productId: body.productId ?? null });
    } else if (request.method() === "PUT" || request.method() === "DELETE") {
      const key = decodeURIComponent(path.split("/").at(-1)!);
      mutationKeys.push(key);
      const index = items.findIndex((item) => item.itemKey === key);
      expect(index).toBeGreaterThanOrEqual(0);
      if (rejectUpdate) return route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } });
      if (request.method() === "DELETE") items.splice(index, 1);
      else Object.assign(items[index], request.postDataJSON());
    }
    await route.fulfill({ json: response() });
  });
  await page.route("**/api/orders/my**", (route) => route.fulfill({ json: { content: [] } }));

  await page.goto(`${customer}/menu/chicken-901`);
  await page.getByRole("button", { name: /Hot/ }).click();
  await page.getByRole("button", { name: /Cheese/ }).click();
  await page.getByRole("button", { name: /Thêm vào giỏ/ }).click();
  await expect.poll(() => additions.length).toBe(1);
  expect(additions[0]).toMatchObject({ productId: 901, optionIds: [12], toppingIds: [22] });
  expect(additions[0].comboId).toBeUndefined();
  await expect(page.getByRole("button", { name: /Đã thêm/ })).toBeVisible();
  await page.goto(`${customer}/cart`);
  await expect(page.getByText("Heat: Hot")).toBeVisible();
  await expect(page.getByText(/Cheese/)).toBeVisible();
  const increase = page.getByRole("button", { name: /Tăng.*Regression Chicken/ });
  await increase.click();
  await expect.poll(() => items[0].quantity).toBe(2);
  await expect(increase).toBeEnabled();
  rejectUpdate = true;
  await increase.click();
  await expect(page.getByRole("alert").filter({ hasText: /Dịch vụ/ })).toBeVisible();
  expect(items[0].quantity).toBe(2);
  await expect(page.getByRole("group", { name: /Thay đổi số lượng/ }).locator("span")).toHaveText("2");
  rejectUpdate = false;
  await page.getByRole("button", { name: /Xóa món/ }).click();
  await expect.poll(() => items.length).toBe(0);
  expect(mutationKeys.every((key) => key === "server-key-1")).toBe(true);

  await page.goto(`${customer}/menu/combo-901`);
  await page.getByRole("button", { name: /Thêm vào giỏ/ }).click();
  await expect.poll(() => additions.length).toBe(2);
  expect(additions[1]).toMatchObject({ comboId: 901, optionIds: [], toppingIds: [] });
  expect(additions[1].productId).toBeUndefined();
  await expect(page.getByRole("button", { name: /Đã thêm/ })).toBeVisible();
  signedIn = true;
  await page.route("**/api/orders/preview", (route) => route.fulfill({ json: {
    subtotal: 120000, discountAmount: 0, pointsAmount: 0, pointsUsed: 0,
    shippingFee: 20000, totalAmount: 140000, voucherValid: false,
  } }));
  let submitted: any;
  await page.route(/\/api\/orders$/, (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 409, json: { code: "VOUCHER_INACTIVE" } });
  });
  await page.goto(`${customer}/checkout`);
  await page.locator("#receiverName").fill("Regression Customer");
  await page.locator("#receiverPhone").fill("0901234567");
  await page.locator("#deliveryAddress").fill("123 Test Street");
  await page.getByRole("button", { name: /Đặt hàng ngay/ }).click();
  await expect.poll(() => submitted?.items?.[0]?.comboId).toBe(901);
  expect(submitted.items[0].productId).toBeUndefined();
  expect(submitted.paymentMethod).toBe("BANK_TRANSFER");
  await expect(page.locator("main [role=alert]")).toBeVisible();
  await expect(page.locator("#receiverName")).toHaveValue("Regression Customer");
  await expect(page.locator("#receiverPhone")).toHaveValue("0901234567");
  expect(items).toHaveLength(1);
});
