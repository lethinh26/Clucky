import { test, expect } from "@playwright/test";

for (const hasHome of [true, false]) {
  test(`branch distances use ${hasHome ? "default address before GPS" : "GPS without a saved home"}`, async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 11, longitude: 106 });
    await page.addInitScript(() => sessionStorage.setItem("clucky_location_prompt", "seen"));
    await page.route("**/api/auth/session", route => route.fulfill({ json: {
      userId: 1, role: "CUSTOMER", fullName: "Customer", email: "customer@example.com",
    } }));
    await page.route("**/api/users/me/addresses", route => route.fulfill({ json: hasHome ? [
      { id: 1, isDefault: false, latitude: 12, longitude: 106 },
      { id: 2, isDefault: true, latitude: 10, longitude: 106 },
    ] : [] }));
    await page.route("**/api/stores?*", route => route.fulfill({ json: [
      { id: 81, name: "Clucky Home", address: "First street", status: "OPEN", phone: "0900000000", openTime: "08:00", closeTime: "22:00", latitude: 10, longitude: 106 },
      { id: 82, name: "Clucky GPS", address: "Second street", status: "OPEN", phone: "0900000001", openTime: "08:00", closeTime: "22:00", latitude: 11, longitude: 106 },
      { id: 83, name: "Clucky No Pin", address: "Third street", status: "OPEN", phone: "0900000002", openTime: "08:00", closeTime: "22:00", latitude: null, longitude: null },
    ] }));
    await page.route("https://api.mapbox.com/styles/v1/**", route => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
    await page.route("https://events.mapbox.com/**", route => route.fulfill({ status: 200, json: {} }));
    const nearId = hasHome ? "81" : "82";
    const farId = hasHome ? "82" : "81";
    await page.goto("http://127.0.0.1:4174/stores");
    await expect(page.locator("main > header img")).toHaveCount(0);
    await expect(page.locator("#branch-" + nearId)).toContainText("~ cách 0 km");
    await expect(page.locator("#branch-" + farId)).toContainText("~ cách 111,2 km");
    await expect(page.locator('[id^="branch-"]').first()).toHaveAttribute("id", "branch-" + nearId);
    await expect(page.locator("#branch-83")).toContainText("Chưa có tọa độ");
    await expect(page.locator("#branch-83 img")).toHaveCount(1);

    await page.goto("http://127.0.0.1:4174/party");
    await expect(page.locator(`#storeSelect option[value="${nearId}"]`)).toContainText("~ cách 0 km");
    await expect(page.locator(`#storeSelect option[value="${farId}"]`)).toContainText("~ cách 111,2 km");
    await expect(page.locator('#storeSelect option[value="83"]')).toContainText("Chưa có tọa độ");
    await expect(page.locator("#party-distance-origin")).toHaveText(hasHome ? "Từ địa chỉ mặc định" : "Từ vị trí hiện tại");
    await page.locator("#storeSelect").selectOption(nearId);
    await expect(page.locator("#storeSelect")).toHaveValue(nearId);
  });
}
