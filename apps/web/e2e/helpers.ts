import { expect, type Page } from '@playwright/test';

/** Signs in through the real OTP UI (dev code 123456). */
export async function login(page: Page, phone: string, next = '/store') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('رقم الجوال').fill(phone);
  await page.getByRole('button', { name: 'إرسال رمز التحقق' }).click();
  await expect(page.getByText('أدخل رمز التحقق')).toBeVisible();
  await page.getByLabel('Digit 1').fill('123456');
  await page.waitForURL((url) => url.pathname.startsWith(next));
}
