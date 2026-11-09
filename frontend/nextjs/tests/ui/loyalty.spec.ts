import { test, expect } from '@playwright/test';

const policy = { version: 1, spendPerPoint: 10000, pointValue: 1000, silverThreshold: 1000, goldThreshold: 5000, silverDiscount: 3, goldDiscount: 5 };
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('clucky_location_prompt', 'seen'));
  await page.route('**/api/auth/session', route => route.fulfill({ json: { userId: 1, role: 'CUSTOMER', fullName: 'Customer', email: 'customer@example.com' } }));
});
test('new member has zero real points and an empty history', async ({ page }) => {
  await page.route('**/api/loyalty/me?*', route => route.fulfill({ json: {
    points: { customerId: 1, totalPoints: 0, availablePoints: 0, reservedPoints: 0, lifetimePoints: 0, tier: 'MEMBER' },
    policy, transactions: [], page: 0, size: 10, totalElements: 0,
  } }));
  await page.goto('http://127.0.0.1:4174/loyalty');
  await expect(page.getByText('Điểm có thể sử dụng', { exact: true })).toBeVisible();
  await expect(page.getByText('Chưa có giao dịch điểm phù hợp.')).toBeVisible();
  await expect(page.locator('main')).not.toContainText('1.450');
  await page.getByRole('button', { name: 'Tích điểm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tích điểm', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
test('API failure shows retry rather than demo balance', async ({ page }) => {
  await page.route('**/api/loyalty/me?*', route => route.fulfill({ status: 503, json: { code: 'DEPENDENCY_UNAVAILABLE' } }));
  await page.goto('http://127.0.0.1:4174/loyalty');
  await expect(page.locator('main').getByRole('alert')).toContainText('Chưa tải được dữ liệu thành viên');
  await expect(page.locator('main')).not.toContainText('1.450');
  await expect(page.getByText('Điểm có thể sử dụng', { exact: true })).toHaveCount(0);
});
