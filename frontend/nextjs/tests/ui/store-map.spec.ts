import { test, expect } from "@playwright/test";

test("store cards focus logo pins, including repeated selection after panning", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("clucky_location_prompt", "seen"));
  await page.route("**/api/auth/session", route => route.fulfill({ status: 401, json: {} }));
  await page.route("**/api/auth/refresh", route => route.fulfill({ status: 401, json: {} }));
  await page.route("**/api/stores?*", route => route.fulfill({ json: [
    { id: 81, name: "Clucky First", address: "First street", city: "Hà Nội", status: "OPEN", phone: "0900000000", openTime: "08:00", closeTime: "22:00", latitude: 21.028, longitude: 105.834 },
    { id: 82, name: "Clucky Second", address: "Second street", city: "Hà Nội", status: "OPEN", phone: "0900000001", openTime: "08:00", closeTime: "22:00", latitude: 21.035, longitude: 105.845 },
    { id: 83, name: "Clucky Third", address: "Third street", city: "Hà Nội", status: "OPEN", phone: "0900000002", openTime: "08:00", closeTime: "22:00", latitude: null, longitude: null },
  ] }));
  let lookups = 0;
  await page.route("**/api/locations/search?*", route => { lookups += 1; return route.fulfill({ json: [] }); });
  await page.route("https://api.mapbox.com/styles/v1/**", route => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
  await page.route("https://events.mapbox.com/**", route => route.fulfill({ status: 200, json: {} }));
  await page.goto("http://127.0.0.1:4174/stores");
  await expect(page.locator("main input")).toHaveCount(1);
  await expect(page.locator('a[href="https://www.geoapify.com/"]')).toHaveCount(0);
  await expect(page.locator(".clucky-map-marker img")).toHaveCount(2);
  const centered = () => page.evaluate(() => {
    const map = document.querySelector(".mapboxgl-map")?.getBoundingClientRect();
    const marker = document.querySelector(".clucky-map-marker.is-selected")?.getBoundingClientRect();
    if (!map || !marker) return false;
    return Math.abs(marker.left + marker.width / 2 - map.left - map.width / 2) < 3
      && Math.abs(marker.bottom - map.top - map.height / 2) < 3;
  });
  await page.locator("#branch-82").getByRole("button").click();
  await expect.poll(centered).toBe(true);
  const map = await page.locator(".mapboxgl-map").boundingBox();
  if (!map) throw new Error("Map was not rendered");
  await page.mouse.move(map.x + map.width / 2, map.y + map.height / 2 + 90);
  await page.mouse.down();
  await page.mouse.move(map.x + map.width / 2 + 120, map.y + map.height / 2 + 90, { steps: 10 });
  await page.mouse.up();
  await expect.poll(centered).toBe(false);
  await page.locator("#branch-82").click({ position: { x: 15, y: 15 } });
  await expect.poll(centered).toBe(true);
  await page.locator("#branch-83").getByRole("button").click();
  await expect(page.locator(".clucky-map-marker img")).toHaveCount(2);
  await expect(page.locator("#store-map").getByRole("status").filter({ hasText: "Chưa xác định được vị trí chi nhánh này." })).toBeVisible();
  expect(lookups).toBe(0);
});
