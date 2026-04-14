import { expect, test } from '@playwright/test';

const strategyFixture = JSON.stringify([
  {
    id: 1n.toString(),
    name: 'Alpha Yield',
    strategyType: 1n.toString(),
    strategyTypeLabel: 'Yield',
    riskTier: 2n.toString(),
    riskLabel: 'Moderate',
    targetProtocolPrincipal: 'SP3FBR2AGKPDX0ZC7YQ4D6N5Q9J2Q4R6V1Q8B0',
    targetAssetSymbol: 'STX',
    estimatedApyRange: '6.00% - 10.50%',
    description: 'Deploys assets to vetted DeFi venues.',
    active: true,
    compatibleProtocols: ['Zest lending'],
    executionConditions: ['Vault must remain active and unlocked.'],
    feeStructure: '1.50% performance fee on realized gains.',
    detailedExplanation: 'Alpha Yield routes vault capital into vetted DeFi venues.',
    historicalPerformance: [{ date: '2026-04-01T00:00:00.000Z', returnPercent: 8.25 }],
  },
  {
    id: 2n.toString(),
    name: 'Beta Rebalance',
    strategyType: 2n.toString(),
    strategyTypeLabel: 'Rebalance',
    riskTier: 2n.toString(),
    riskLabel: 'Moderate',
    targetProtocolPrincipal: 'SP2C2...',
    targetAssetSymbol: 'STX',
    estimatedApyRange: '7.00% - 12.00%',
    description: 'Rebalances across integrated venues.',
    active: true,
    compatibleProtocols: ['Zest lending', 'ALEX liquidity'],
    executionConditions: ['Vault must remain active and unlocked.'],
    feeStructure: '1.50% performance fee on realized gains.',
    detailedExplanation: 'Beta Rebalance keeps the vault aligned.',
    historicalPerformance: [{ date: '2026-04-01T00:00:00.000Z', returnPercent: 7.25 }],
  },
  {
    id: 3n.toString(),
    name: 'Gamma Exit',
    strategyType: 4n.toString(),
    strategyTypeLabel: 'Exit',
    riskTier: 1n.toString(),
    riskLabel: 'Conservative',
    targetProtocolPrincipal: 'SP2C3...',
    targetAssetSymbol: 'BTC',
    estimatedApyRange: '0.00% - 2.00%',
    description: 'Prioritizes principal defense.',
    active: true,
    compatibleProtocols: ['stSTX', 'Zest lending'],
    executionConditions: ['Vault must remain active and unlocked.'],
    feeStructure: '1.50% performance fee on realized gains.',
    detailedExplanation: 'Gamma Exit exists to protect capital.',
    historicalPerformance: [{ date: '2026-04-01T00:00:00.000Z', returnPercent: 1.25 }],
  },
]);

test('strategy browser loads and filters strategies', async ({ page }) => {
  await page.addInitScript((strategies) => {
    window.localStorage.setItem('vmind-e2e-strategies', strategies);
  }, strategyFixture);

  await page.goto('/strategies', { waitUntil: 'networkidle' });

  await expect(page.getByText('Alpha Yield')).toBeVisible();
  await expect(page.getByText('Beta Rebalance')).toBeVisible();
  await expect(page.getByText('Gamma Exit')).toBeVisible();

  await page.getByRole('combobox', { name: 'Strategy type' }).click();
  await page.getByRole('option', { name: 'Exit' }).click();

  await expect(page.getByText('Gamma Exit')).toBeVisible();
  await expect(page.getByText('Alpha Yield')).toHaveCount(0);
  await expect(page.getByText('Beta Rebalance')).toHaveCount(0);
});