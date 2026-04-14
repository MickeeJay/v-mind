import { env } from '@/lib/env';

import type {
  DashboardPortfolioSummary,
  DashboardVault,
  DashboardVaultResponse,
  VaultPerformancePoint,
  VaultStatus,
} from '@/types/dashboard';

interface FetchOptions {
  signal?: AbortSignal;
}

const E2E_DASHBOARD_FIXTURE_KEY = 'vmind-e2e-dashboard-vaults';

interface ApiResult {
  payload: unknown;
  status: number;
}

function timeoutMs(): number {
  const parsed = Number(env.NEXT_PUBLIC_API_TIMEOUT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
}

function statusFromRaw(value: unknown): VaultStatus {
  const normalized = String(value ?? 'active').toLowerCase();

  if (normalized === 'active' || normalized === 'paused' || normalized === 'cooldown' || normalized === 'archived') {
    return normalized;
  }

  return 'active';
}

function numberFromRaw(value: unknown, fallback = 0): number {
  const next = typeof value === 'string' ? Number(value) : value;
  return typeof next === 'number' && Number.isFinite(next) ? next : fallback;
}

function isoFromRaw(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function generateSeries(baseValueUsd: number): VaultPerformancePoint[] {
  const today = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (29 - index));

    const drift = 0.975 + index * 0.0015;
    const wave = Math.sin(index / 4) * 0.018;
    const valueUsd = Math.max(0, baseValueUsd * (drift + wave));

    return {
      date: day.toISOString(),
      valueUsd: Number(valueUsd.toFixed(2)),
    };
  });
}

function normalizeVault(raw: unknown, index: number): DashboardVault {
  const item = (raw ?? {}) as Record<string, unknown>;

  const id = String(item.id ?? item.vaultId ?? `vault-${index + 1}`);
  const name = String(item.name ?? item.vaultName ?? `V-Mind Vault ${index + 1}`);
  const strategyName = String(item.strategyName ?? item.strategy ?? 'Adaptive Yield');
  const balanceBtc = numberFromRaw(item.balanceBtc ?? item.balance_btc ?? item.btcBalance, 0);
  const balanceUsd = numberFromRaw(item.balanceUsd ?? item.balance_usd ?? item.usdBalance, balanceBtc * 90_000);
  const estimatedApy = numberFromRaw(item.estimatedApy ?? item.apy ?? item.currentApy, 0);
  const yieldEarnedBtc = numberFromRaw(item.yieldEarnedBtc ?? item.yield_btc ?? item.totalYieldBtc, 0);
  const lastExecutionAt = isoFromRaw(item.lastExecutionAt ?? item.last_execution_at ?? item.lastExecutedAt);
  const status = statusFromRaw(item.status);

  const performanceRaw = Array.isArray(item.performance30d) ? item.performance30d : [];
  const performance30d =
    performanceRaw.length > 0
      ? performanceRaw
          .map((point) => {
            const p = point as Record<string, unknown>;
            const date = isoFromRaw(p.date);
            const valueUsd = numberFromRaw(p.valueUsd ?? p.value_usd);

            if (!date) {
              return null;
            }

            return { date, valueUsd };
          })
          .filter((point): point is VaultPerformancePoint => point !== null)
      : generateSeries(balanceUsd);

  return {
    id,
    name,
    strategyName,
    balanceBtc,
    balanceUsd,
    estimatedApy,
    yieldEarnedBtc,
    lastExecutionAt,
    status,
    performance30d,
  };
}

function extractVaultArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>;

    if (Array.isArray(source.vaults)) {
      return source.vaults;
    }

    if (Array.isArray(source.data)) {
      return source.data;
    }

    if (source.data && typeof source.data === 'object' && Array.isArray((source.data as Record<string, unknown>).vaults)) {
      return (source.data as Record<string, unknown>).vaults as unknown[];
    }
  }

  return [];
}

function readE2eDashboardFixture(ownerAddress: string): DashboardVaultResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(E2E_DASHBOARD_FIXTURE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { owner?: string; vaults?: unknown[] } | unknown[];

    if (Array.isArray(parsed)) {
      return {
        owner: ownerAddress,
        vaults: parsed.map((entry, index) => normalizeVault(entry, index)),
      };
    }

    const fixtureOwner = parsed.owner?.trim();

    if (fixtureOwner && fixtureOwner !== ownerAddress) {
      return null;
    }

    return {
      owner: fixtureOwner ?? ownerAddress,
      vaults: (parsed.vaults ?? []).map((entry, index) => normalizeVault(entry, index)),
    };
  } catch {
    return null;
  }
}

async function fetchJson(url: string, options?: FetchOptions): Promise<ApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  const linkSignal = () => {
    if (!options?.signal) {
      return;
    }

    if (options.signal.aborted) {
      controller.abort();
      return;
    }

    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  };

  linkSignal();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const isJson = response.headers.get('content-type')?.toLowerCase().includes('application/json');
    const payload: unknown = isJson ? await response.json() : null;

    return {
      payload,
      status: response.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function tryAgentVaultFetch(ownerAddress: string, options?: FetchOptions): Promise<DashboardVault[] | null> {
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  const version = env.NEXT_PUBLIC_API_VERSION;

  const targets = [
    `${baseUrl}/${version}/vaults?owner=${ownerAddress}`,
    `${baseUrl}/${version}/dashboard/vaults?owner=${ownerAddress}`,
    `${baseUrl}/vaults?owner=${ownerAddress}`,
    `${baseUrl}/dashboard/vaults?owner=${ownerAddress}`,
  ];

  let lastError: Error | null = null;

  for (const target of targets) {
    try {
      const result = await fetchJson(target, options);

      if (result.status === 404) {
        continue;
      }

      if (result.status >= 400) {
        lastError = new Error(`Request failed with status ${result.status}`);
        continue;
      }

      const rawVaults = extractVaultArray(result.payload);
      return rawVaults.map((raw, index) => normalizeVault(raw, index));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown API fetch error');
    }
  }

  if (lastError) {
    throw lastError;
  }

  return null;
}

async function hasStacksConnectivity(address: string, options?: FetchOptions): Promise<boolean> {
  const apiRoot = env.NEXT_PUBLIC_STACKS_API_URL.replace(/\/$/, '');
  const target = `${apiRoot}/extended/v1/address/${address}/balances`;

  try {
    const result = await fetchJson(target, options);
    return result.status >= 200 && result.status < 500;
  } catch {
    return false;
  }
}

export async function fetchDashboardVaults(ownerAddress: string, options?: FetchOptions): Promise<DashboardVaultResponse> {
  const normalizedOwner = ownerAddress.trim();

  if (!normalizedOwner) {
    throw new Error('Wallet address is required to fetch dashboard vaults.');
  }

  const fixture = readE2eDashboardFixture(normalizedOwner);

  if (fixture) {
    return fixture;
  }

  const agentVaults = await tryAgentVaultFetch(normalizedOwner, options);

  if (agentVaults) {
    return {
      owner: normalizedOwner,
      vaults: agentVaults,
    };
  }

  const reachable = await hasStacksConnectivity(normalizedOwner, options);

  if (!reachable) {
    throw new Error('Unable to load blockchain data right now. Please try again.');
  }

  return {
    owner: normalizedOwner,
    vaults: [],
  };
}

export function buildPortfolioSummary(vaults: DashboardVault[]): DashboardPortfolioSummary {
  const totalAumUsd = vaults.reduce((sum, vault) => sum + vault.balanceUsd, 0);
  const totalYieldBtc = vaults.reduce((sum, vault) => sum + vault.yieldEarnedBtc, 0);
  const activeVaults = vaults.filter((vault) => vault.status === 'active').length;

  const cumulativeSeries = Array.from({ length: 30 }, (_, index) => {
    const points = vaults.map((vault) => vault.performance30d[index] ?? vault.performance30d[vault.performance30d.length - 1]);

    const valueUsd = points.reduce((sum, point) => sum + (point?.valueUsd ?? 0), 0);
    const date = points[0]?.date ?? new Date().toISOString();

    return {
      date,
      valueUsd: Number(valueUsd.toFixed(2)),
    };
  });

  return {
    totalAumUsd,
    totalYieldBtc,
    activeVaults,
    performance30d: cumulativeSeries,
  };
}
