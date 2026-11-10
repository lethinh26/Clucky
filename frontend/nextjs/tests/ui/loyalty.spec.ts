import { test, expect } from '@playwright/test';
import { getTranslator } from '../../lib/i18n/translator';

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

for (const locale of ['vi', 'en'] as const) {
  test(`reward rules use live policy, brand fonts and a compact mobile layout (${locale})`, async ({ page, context }) => {
    const origin = 'http://127.0.0.1:4174';
    const translate = getTranslator(locale);
    const money = (value: number) => new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(value);
    await context.addCookies([{ name: 'clucky_locale', value: locale, url: origin }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/loyalty/me?*', route => route.fulfill({ json: {
      points: { customerId: 1, totalPoints: 0, availablePoints: 0, reservedPoints: 0, lifetimePoints: 0, tier: 'MEMBER' },
      policy: { ...policy, spendPerPoint: 20000, pointValue: 500, silverDiscount: 4, goldDiscount: 9 },
      transactions: [], page: 0, size: 10, totalElements: 0,
    } }));
    await page.goto(origin + '/loyalty');
    const rules = page.getByRole('region', { name: translate('loyalty.rulesTitle'), exact: true });
    await expect(rules).toBeVisible();
    await expect(rules.getByRole('list', { name: translate('loyalty.rulesSequence') }).getByRole('listitem')).toHaveCount(3);
    await expect(rules).toContainText(translate('loyalty.rulesTierText', { silver: '4', gold: '9' }));
    await expect(rules).toContainText(translate('loyalty.rulesPointsText', { amount: money(500) }));
    await expect(rules).toContainText(translate('loyalty.rulesEarnRate', { amount: money(20000) }));
    await expect(rules).toContainText(translate('loyalty.rulesCompleted'));
    await expect(rules).toContainText(translate('loyalty.rulesRounding'));
    await expect(rules).toContainText(translate('loyalty.rulesShipping'));
    await expect(page.locator('main')).not.toContainText(/Điểm đang giữ không thể dùng|Chỉ là ước tính;|Reserved points cannot be used|An estimate only;/);
    await expect(rules.getByRole('heading', { level: 3 })).toHaveCSS('font-family', /Baloo 2/);
    await expect(rules.getByRole('heading', { level: 4 }).first()).toHaveCSS('font-family', /Quicksand/);
    await expect(page.locator('head link[href*="fonts.googleapis.com/css2"]')).not.toHaveAttribute('href', /Fredoka/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
