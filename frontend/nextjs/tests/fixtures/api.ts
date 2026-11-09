import type { Page } from "@playwright/test";

export const testStore = { id: 1, name: "Clucky Test", address: "Test street", status: "OPEN", phone: "0900000000", openTime: "08:00", closeTime: "22:00" };

export async function seedApi(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("clucky_location_prompt", "seen"));
  await page.route("**/api/auth/session", route => route.fulfill({ json: {
    userId: 1, role: route.request().headers()["x-clucky-client"] === "admin" ? "ADMIN" : "CUSTOMER",
    email: "test@example.com", fullName: "Test User",
  } }));
  await page.route("**/api/cart", route => route.fulfill({ json: { items: [], subtotal: 0, itemCount: 0 } }));
  await page.route("**/api/users/me", route => route.fulfill({ json: { fullName: "Test User", email: "test@example.com", phone: "0901234567" } }));
  await page.route("**/api/users/me/addresses", route => route.fulfill({ json: [] }));
  await page.route(/\/api\/stores(?:\?.*)?$/, route => route.fulfill({ json: [testStore] }));
  await page.route("**/api/catalog/**", route => route.fulfill({ json: [] }));
  await page.route("**/api/refund-requests**", route => route.fulfill({ json: [] }));
  await page.route(/\/api\/orders(?:\/my)?(?:\?.*)?$/, route => route.request().method() === "GET"
    ? route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0 } }) : route.fallback());
  await page.route("**/api/loyalty/me?*", route => route.fulfill({ json: { points: { availablePoints: 0 } } }));
}
