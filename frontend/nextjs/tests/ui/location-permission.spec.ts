import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    locationTest: {
      available: boolean;
      permission: PermissionState;
      requests: number;
      status: EventTarget;
      fail: () => void;
      accuracy?: boolean[];
    };
  }
}

for (const failure of ["insecure", 1, 2, 3] as const) {
  test(`current-location failure ${failure} stays visible and does not retry on focus`, async ({ page }) => {
    await page.clock.install();
    await page.addInitScript(code => {
      sessionStorage.setItem("clucky_location_prompt", "seen");
      const status = new EventTarget();
      const control = window.locationTest = { available: false, permission: "prompt" as PermissionState,
        requests: 0, status, fail: () => {}, accuracy: [] as boolean[] };
      Object.defineProperty(status, "state", { get: () => control.permission });
      Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: async () => status } });
      if (code === "insecure") Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        getCurrentPosition(success: PositionCallback, error: PositionErrorCallback, options: PositionOptions) {
          control.requests += 1;
          control.accuracy.push(Boolean(options.enableHighAccuracy));
          if (control.available) success({ coords: { latitude: 10.8, longitude: 106.7 } } as GeolocationPosition);
          else error({ code: code === "insecure" ? 1 : code, message: "Location unavailable", PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        },
      } });
    }, failure);
    let reverseRequests = 0;
    await page.route("**/api/locations/reverse?*", route => {
      reverseRequests += 1;
      expect(new URL(route.request().url()).searchParams.get("latitude")).toBe("10.8");
      return route.fulfill({ json: [{ latitude: 10.8, longitude: 106.7, label: "GPS address", detail: "GPS address",
        province: "Test city", district: "Test district", ward: "Test ward" }] });
    });
    await page.goto("http://127.0.0.1:4175/?location");
    await page.getByRole("button", { name: "Dùng vị trí hiện tại", exact: true }).click();
    const alert = page.locator('section[aria-label="Bản đồ vị trí"] > [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(failure === "insecure" ? "ngữ cảnh an toàn" : failure === 1 ? "chặn quyền vị trí" : failure === 2 ? "chưa cung cấp được tọa độ" : "hết thời gian chờ");
    const requests = failure === "insecure" ? 0 : failure === 1 ? 1 : 2;
    await expect.poll(() => page.evaluate(() => window.locationTest.requests)).toBe(requests);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.fastForward(6000);
    await expect(alert).toBeVisible();
    await expect(page.locator('[data-sonner-toast][data-type="warning"]')).toBeVisible();
    expect(await page.evaluate(() => window.locationTest.requests)).toBe(requests);
    expect(reverseRequests).toBe(0);
    await expect(page.getByLabel("Số nhà, đường, căn hộ", { exact: true })).toHaveValue("Old address");
    if (failure === "insecure") return;
    if (failure !== 1) expect(await page.evaluate(() => window.locationTest.accuracy)).toEqual([false, true]);
    await page.evaluate(() => {
      window.locationTest.available = true;
      window.locationTest.permission = "granted";
      window.locationTest.status.dispatchEvent(new Event("change"));
    });
    await expect(alert).toHaveCount(0);
    await expect(page.getByLabel("Số nhà, đường, căn hộ", { exact: true })).toHaveValue("GPS address");
    expect(reverseRequests).toBe(1);
  });
}

for (const recovery of ["change", "focus", "retry", "pending"] as const) {
  test(`location warning clears after permission recovery via ${recovery}`, async ({ page }) => {
    await page.addInitScript(delayFailure => {
      sessionStorage.removeItem("clucky_location_prompt");
      const status = new EventTarget();
      const control = window.locationTest = { available: false, permission: "prompt" as PermissionState,
        requests: 0, status, fail: () => {} };
      Object.defineProperty(status, "state", { get: () => control.permission });
      Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: async () => status } });
      Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
        getCurrentPosition(success: PositionCallback, failure?: PositionErrorCallback) {
          control.requests += 1;
          if (control.available) {
            success({ coords: { latitude: 10.8, longitude: 106.7, accuracy: 10, altitude: null,
              altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
          } else {
            control.fail = () => failure?.({ code: 1, message: "Location unavailable", PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
            if (!delayFailure) control.fail();
          }
        },
      } });
    }, recovery === "pending");
    await page.route("**/api/auth/session", route => route.fulfill({ json: null }));
    await page.route("**/api/cart", route => route.fulfill({ json: { items: [], itemCount: 0, subtotal: 0 } }));
    await page.goto("http://127.0.0.1:4174/login");
    await page.getByRole("button", { name: "Chia sẻ vị trí", exact: true }).click();
    const warning = page.locator('[data-sonner-toast][data-type="warning"]');
    if (recovery !== "pending") await expect(warning).toContainText("Không lấy được vị trí");
    await page.evaluate(mode => {
      const control = window.locationTest;
      control.available = true;
      control.permission = "granted";
      if (mode === "focus") window.dispatchEvent(new Event("focus"));
      if (mode === "change" || mode === "pending") control.status.dispatchEvent(new Event("change"));
      if (mode === "pending") control.fail();
    }, recovery);
    if (recovery === "retry") await page.getByRole("button", { name: "Chia sẻ vị trí", exact: true }).click();
    await expect(warning).toHaveCount(0, { timeout: 1500 });
    await expect(page.getByRole("complementary", { name: "Cho Clucky biết vị trí của bạn?" })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.locationTest.requests)).toBe(2);
  });
}
