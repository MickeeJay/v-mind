import { expect, test } from '@playwright/test';

test('landing on the app shows the connect wallet prompt', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
});