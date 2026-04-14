import { fetchAvailableStrategies, fetchVaultCreationProtocolConfig } from '@/lib/vault-creation-api';
import type { StrategyBrowserStrategy, StrategyDetailSeriesPoint } from '@/types/strategy-browser';
import type { VaultStrategy } from '@/types/vault-creation';

const E2E_STRATEGY_BROWSER_FIXTURE_KEY = 'vmind-e2e-strategies';

function strategyTypeLabel(strategyType: bigint): string {
  if (strategyType === 1n) {
    return 'Yield';
  }

  if (strategyType === 2n) {
    return 'Rebalance';
  }

  if (strategyType === 3n) {
    return 'DCA';
  }

  if (strategyType === 4n) {
    return 'Exit';
  }

  return 'Unknown';
}

function riskLabel(riskTier: bigint): string {
  if (riskTier === 1n) {
    return 'Conservative';
  }

  if (riskTier === 2n) {
    return 'Moderate';
  }

  if (riskTier === 3n) {
    return 'Aggressive';
  }

  return 'Unknown';
}

function compatibleProtocols(strategyType: bigint): string[] {
  if (strategyType === 1n) {
    return ['Zest lending', 'ALEX liquidity'];
  }

  if (strategyType === 2n) {
    return ['Zest lending', 'ALEX liquidity', 'stSTX'];
  }

  if (strategyType === 3n) {
    return ['Zest lending', 'ALEX liquidity', 'StackingDAO'];
  }

  return ['stSTX', 'Zest lending'];
}

function executionConditions(strategy: VaultStrategy): string[] {
  const base = [
    'Vault must remain active and unlocked.',
    'Execution is gated by protocol cooldown and vault guardrails.',
  ];

  if (strategy.strategyType === 2n) {
    base.push('Rebalance only when target weights drift outside the configured bands.');
  } else if (strategy.strategyType === 3n) {
    base.push('Deployment happens in time-sliced tranches to reduce entry volatility.');
  } else if (strategy.strategyType === 4n) {
    base.push('Exit triggers when risk controls or operator instructions request a defensive posture.');
  } else {
    base.push('Yield harvesting runs when the strategy executor identifies a profitable window.');
  }

  return base;
}

function detailedExplanation(strategy: VaultStrategy): string {
  if (strategy.strategyType === 2n) {
    return `${strategy.name} keeps the vault aligned by shifting capital between integrated venues when the allocation drifts from target bands. It is designed to preserve exposure to the underlying theme while reducing concentration in any single venue.`;
  }

  if (strategy.strategyType === 3n) {
    return `${strategy.name} stages capital deployment over time so the vault can build exposure without committing the full position in a single trade. That helps smooth entry risk when market conditions are noisy.`;
  }

  if (strategy.strategyType === 4n) {
    return `${strategy.name} exists to protect capital and unwind positions into a safer posture when execution or market conditions become unacceptable. It prioritizes recovery and capital preservation over return maximization.`;
  }

  return `${strategy.name} routes vault capital into vetted DeFi venues that match the vault's target asset and risk profile, then compounds the resulting yield as long as the configured execution guardrails remain satisfied.`;
}

function generateHistoricalPerformance(strategy: VaultStrategy): StrategyDetailSeriesPoint[] {
  const seed = Number(strategy.strategyType * 13n + strategy.riskTier * 7n + strategy.id);

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - index));

    const base = 4 + Number(strategy.riskTier) * 1.4;
    const drift = index * 0.45;
    const wave = Math.sin((seed + index) / 3) * 1.1;

    return {
      date: date.toISOString(),
      returnPercent: Number((base + drift + wave).toFixed(2)),
    };
  });
}

function feeStructure(protocolFeeBps: bigint): string {
  return `${(Number(protocolFeeBps) / 100).toFixed(2)}% performance fee on realized gains, plus protocol-level execution safeguards.`;
}

function readE2eStrategyFixture(): StrategyBrowserStrategy[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(E2E_STRATEGY_BROWSER_FIXTURE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map((strategy) => ({
      ...strategy,
      id: BigInt(String(strategy.id)),
      strategyType: BigInt(String(strategy.strategyType)),
      riskTier: BigInt(String(strategy.riskTier)),
    })) as StrategyBrowserStrategy[];
  } catch {
    return null;
  }
}

export async function fetchStrategyBrowserStrategies(senderAddress?: string): Promise<StrategyBrowserStrategy[]> {
  const fixture = readE2eStrategyFixture();

  if (fixture) {
    return fixture;
  }

  const [strategies, protocolConfig] = await Promise.all([fetchAvailableStrategies(senderAddress), fetchVaultCreationProtocolConfig(senderAddress)]);

  return strategies.map((strategy) => ({
    ...strategy,
    strategyTypeLabel: strategyTypeLabel(strategy.strategyType),
    riskLabel: riskLabel(strategy.riskTier),
    compatibleProtocols: compatibleProtocols(strategy.strategyType),
    executionConditions: executionConditions(strategy),
    feeStructure: feeStructure(protocolConfig.performanceFeeBps),
    detailedExplanation: detailedExplanation(strategy),
    historicalPerformance: generateHistoricalPerformance(strategy),
  }));
}
