import { test, expect } from '@playwright/test';
import { seedApi } from '../fixtures/api';

const customer = 'http://127.0.0.1:4174';
const admin = 'http://127.0.0.1:4173';
const hero = { id: 1, title: 'Hero One', imageUrl: '/images/food-placeholder.svg', imagePublicId: 'clucky/banners/one',
  linkUrl: '/menu', position: 'HERO_HOME', displayOrder: 0, isActive: true, effectiveStatus: 'ACTIVE', version: 0 };

test.beforeEach(async ({ page, context }) => {
  await seedApi(page);
  await context.addCookies([{ name: 'clucky_locale', value: 'en', url: customer }]);
  await page.route('**/api/promotions/vouchers**', route => route.fulfill({ json: [] }));
});

test('live banners support keyboard navigation, safe links and modal dismissal across reloads', async ({ page }) => {
  await page.route('**/api/promotions/banners', route => route.fulfill({ json: [hero,
    { ...hero, id: 2, title: 'Hero Two', linkUrl: '/\\evil.example' },
    { ...hero, id: 3, title: 'Popup Offer', position: 'POPUP' },
  ] }));
  await page.goto(customer);
  const popup = page.getByRole('dialog', { name: 'Popup Offer' });
  await expect(popup).toBeVisible();
  expect(await popup.evaluate(element => element.contains(document.activeElement))).toBe(true);
  expect(await popup.evaluate(element => element.matches(':modal'))).toBe(true);
  await page.locator('header a').first().evaluate(element => (element as HTMLElement).focus());
  expect(await popup.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  const carousel = page.getByRole('region', { name: 'Promotional banner carousel' });
  await carousel.hover();
  await expect(carousel.getByRole('link', { name: 'Hero One' })).toBeVisible();
  await expect(carousel.locator('.banner-slide').nth(1)).toHaveAttribute('inert', '');
  await carousel.focus();
  await page.keyboard.press('ArrowRight');
  await expect(carousel.locator('.banner-slide--active')).toContainText('Hero Two');
  await expect(carousel.getByRole('link')).toHaveCount(0);
  await page.reload();
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: "Don't show again" }).click();
  await expect(popup).toHaveCount(0);
  await page.reload();
  await expect(carousel).toBeVisible();
  await expect(popup).toHaveCount(0);
});

test('admin banner create, edit, toggle and delete use persisted API data and versions', async ({ page }) => {
  let banners = [hero];
  await page.route('**/api/promotions/banners**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET') return route.fulfill({ json: banners });
    if (request.method() === 'POST') {
      expect(request.headers()['content-type']).toContain('multipart/form-data');
      expect(request.postDataBuffer()?.toString()).toContain('filename="banner.png"');
      const created = { ...hero, id: 2, title: 'Created Offer' };
      banners = [...banners, created];
      return route.fulfill({ status: 201, json: created });
    }
    const current = banners.find(banner => banner.id === Number(url.pathname.split('/').at(-1)))!;
    if (request.method() === 'PUT') {
      const payload = request.postDataJSON();
      expect(payload.expectedVersion).toBe(current.version);
      const updated = { ...current, ...payload, version: current.version + 1 };
      banners = banners.map(banner => banner.id === current.id ? updated : banner);
      return route.fulfill({ json: updated });
    }
    expect(request.method()).toBe('DELETE');
    expect(url.searchParams.get('expectedVersion')).toBe(String(current.version));
    banners = banners.filter(banner => banner.id !== current.id);
    return route.fulfill({ status: 204 });
  });
  await page.goto(admin + '/admin/promotions');
  await page.getByRole('tab').filter({ hasText: 'Promo Banners' }).click();
  await expect(page.getByRole('heading', { name: 'Hero One' })).toBeVisible();
  await page.getByRole('button', { name: /Create Banner/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Banner title').fill('Created Offer');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'banner.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6PukAAAAASUVORK5CYII=', 'base64') });
  await dialog.getByRole('button', { name: 'Create Banner', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const card = page.locator('.ant-card').filter({ has: page.getByRole('heading', { name: 'Created Offer', exact: true }) });
  await card.getByRole('button', { name: /Edit/ }).click();
  await dialog.getByLabel('Banner title').fill('Edited Offer');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab').filter({ hasText: 'Promo Banners' }).click();
  const edited = page.locator('.ant-card').filter({ has: page.getByRole('heading', { name: 'Edited Offer', exact: true }) });
  await edited.getByRole('switch').click();
  await expect(edited.getByRole('switch')).not.toBeChecked();
  await edited.getByRole('button', { name: /Delete/ }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(edited).toHaveCount(0);
  expect(banners.map(banner => banner.id)).toEqual([1]);
});

test('store managers cannot access banner management', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: {
    userId: 2, role: 'STORE_MANAGER', storeId: 1, fullName: 'Manager', email: 'manager@example.test',
  } }));
  await page.goto(admin + '/admin/promotions');
  await expect(page.getByRole('tab').filter({ hasText: 'Vouchers' })).toBeVisible();
  await expect(page.getByRole('tab').filter({ hasText: 'Promo Banners' })).toHaveCount(0);
});
