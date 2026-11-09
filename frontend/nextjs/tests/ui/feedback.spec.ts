import { test, expect } from '@playwright/test';

test('customer validation uses one dismissible top-right notification', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('clucky_location_prompt', 'seen'));
  await page.route('**/api/auth/session', route => route.fulfill({ json: null }));
  await page.route('**/api/cart', route => route.fulfill({ json: { items: [], itemCount: 0, subtotal: 0 } }));
  await page.goto('http://127.0.0.1:4174/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const notification = page.locator('[data-sonner-toast][data-type="error"]');
  await expect(notification).toHaveCount(1);
  await expect(notification).toContainText('Không thể hoàn tất');
  await expect(notification.locator('[data-description]')).not.toBeEmpty();
  await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute('data-x-position', 'right');
  await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute('data-y-position', 'top');
  await notification.getByRole('button', { name: 'Đóng thông báo' }).click();
  await expect(notification).toHaveCount(0);
});
