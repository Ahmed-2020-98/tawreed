import { expect, type Page, test } from '@playwright/test';
import { login } from './helpers';

async function addFromProductPage(page: Page, slug: string, qty: number) {
  await page.goto(`/product/${slug}`);
  const input = page.getByLabel('Quantity').first();
  await input.click();
  await input.fill(String(qty));
  await input.blur();
  await page.getByRole('button', { name: 'أضف للسلة' }).first().click();
  await expect(page.getByText('تمت الإضافة إلى السلة')).toBeVisible();
}

test('buyer signs in by OTP, fills a two-supplier cart and checks out with cash on delivery', async ({ page }) => {
  await login(page, '0500000011');
  await expect(page.getByText('ياسر الزهراني').first()).toBeVisible();

  // Clean slate, then two suppliers delivering to Jeddah.
  await page.request.delete('/api/proxy/buyer/cart');
  await addFromProductPage(page, 'arabic-coffee-cardamom', 2);
  await addFromProductPage(page, 'paper-cup-8oz', 40);

  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'سلة المشتريات' })).toBeVisible();
  await expect(page.getByText('بن الجزيرة للتجارة')).toBeVisible();
  await expect(page.getByText('مستلزمات الضيافة الحديثة')).toBeVisible();
  await page.getByRole('link', { name: 'إتمام الطلب' }).click();

  await expect(page.getByRole('heading', { name: 'إتمام الطلب' })).toBeVisible();
  await page.getByRole('radio', { name: /الدفع عند الاستلام/ }).click();
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click();

  await expect(page.getByRole('heading', { name: 'تم استلام طلبك بنجاح' })).toBeVisible();
  const orderNo = await page.getByText(/TW-\d{4}-\d{6}/).first().textContent();
  expect(orderNo).toMatch(/TW-\d{4}-\d{6}/);

  await page.getByRole('link', { name: 'عرض الطلب' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('TW-');
  await expect(page.getByText('بانتظار القبول').first()).toBeVisible();
  // Header cart badge is cleared after ordering
  await page.goto('/account/orders');
  await expect(page.getByText(orderNo!.match(/TW-\d{4}-\d{6}/)![0])).toBeVisible();
});

test('credit buyer checks out on Pay Later and sees the order in the portal', async ({ page }) => {
  await login(page, '0500000001');
  await page.request.delete('/api/proxy/buyer/cart');
  await addFromProductPage(page, 'basmati-1121-sella', 10);
  await page.goto('/checkout');
  await page.getByRole('radio', { name: /الدفع الآجل/ }).click();
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click();
  await expect(page.getByRole('heading', { name: 'تم استلام طلبك بنجاح' })).toBeVisible();
  await page.goto('/account/credit');
  await expect(page.getByRole('heading', { name: 'الدفع الآجل' })).toBeVisible();
});
