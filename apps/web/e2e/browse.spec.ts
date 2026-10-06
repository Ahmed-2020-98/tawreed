import { expect, test } from '@playwright/test';

test.describe('guest browsing', () => {
  test('landing → store → category → product with supplier offers', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('توريد بالجملة');
    await page.getByRole('link', { name: 'تصفح المنتجات' }).first().click();
    await expect(page).toHaveURL(/\/store$/);
    await expect(page.getByText('تسوّق حسب الفئة')).toBeVisible();

    await page.goto('/c/rice');
    await expect(page.getByRole('heading', { level: 1, name: 'الأرز' })).toBeVisible();
    await expect(page.locator('article').first()).toBeVisible();

    await page.goto('/product/basmati-1121-sella');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('بسمتي');
    await expect(page.getByText('أسعار الكميات')).toBeVisible();
    await expect(page.getByText('عروض موردين آخرين')).toBeVisible();
    // JSON-LD for SEO
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });

  test('search suggestions and results', async ({ page }) => {
    await page.goto('/store');
    const box = page.getByRole('combobox').first();
    await box.fill('تمر');
    await expect(page.getByRole('listbox')).toBeVisible();
    await box.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('English is served under /en with LTR layout', async ({ page }) => {
    await page.goto('/en/store');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Shop by category')).toBeVisible();
  });

  test('guests are sent to login from the cart', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login\?next=%2Fcart/);
  });
});
