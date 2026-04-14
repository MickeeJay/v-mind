import { expect, test } from '@playwright/test';

const walletAddress = 'SP2R3D6H6HFGKQ9H5A2N89Q22C9X6FN8N8JBXK0N4';

test('connecting a mock wallet shows the empty dashboard state', async ({ page }) => {
  await page.addInitScript(({ address, dashboardFixture }) => {
    window.localStorage.setItem('vmind-e2e-wallet-address', address);
    window.localStorage.setItem('vmind-e2e-dashboard-vaults', dashboardFixture);
  }, {
    address: walletAddress,
    dashboardFixture: JSON.stringify({ owner: walletAddress, vaults: [] }),
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  await expect(page.getByText('No vaults found for this wallet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create your first vault' })).toBeVisible();
});