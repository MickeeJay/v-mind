'use client';

import { RefreshCw } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchVaultPerformanceSeries } from '@/lib/vault-detail-api';
import { formatMicrostx, formatPercent, formatVaultDate } from '@/lib/vault-detail-formatters';

import type { VaultPerformancePoint } from '@/types/vault-detail';

interface PerformanceChartProps {
  vaultId: bigint;
}

const PERIODS = ['7D', '30D', '90D', 'All'] as const;

function buildPath(points: VaultPerformancePoint[]): string {
  const values = points.map((point) => Number(point.sharePriceScaled));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((Number(point.sharePriceScaled) - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function PerformanceChart({ vaultId }: PerformanceChartProps): JSX.Element {
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>('30D');
  const [series, setSeries] = React.useState<VaultPerformancePoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    void fetchVaultPerformanceSeries(vaultId, period)
      .then((points) => {
        if (alive) {
          setSeries(points);
        }
      })
      .catch((fetchError) => {
        if (alive) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load vault performance.');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [period, vaultId]);

  const chartPath = React.useMemo(() => buildPath(series), [series]);
  const values = series.map((point) => Number(point.sharePriceScaled));
  const firstValue = values[0] ?? 0;
  const lastValue = values[values.length - 1] ?? 0;
  const totalReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  if (loading) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Performance chart</CardDescription>
          <CardTitle>Share price over time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Performance chart</CardDescription>
          <CardTitle>Share price over time</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-foreground">Unable to load performance data</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setError(null);
                setLoading(true);
                void fetchVaultPerformanceSeries(vaultId, period)
                  .then(setSeries)
                  .catch((fetchError) => {
                    setError(fetchError instanceof Error ? fetchError.message : 'Unable to load vault performance.');
                  })
                  .finally(() => setLoading(false));
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (series.length < 2) {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardHeader>
          <CardDescription>Performance chart</CardDescription>
          <CardTitle>Share price over time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Not enough historical points are available yet for this vault.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="gap-2">
        <CardDescription>Performance chart</CardDescription>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="font-[var(--font-display)] text-xl">Share price over time</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Returns since inception for vault #{vaultId.toString()}</p>
          </div>

          <div className="inline-flex rounded-xl border border-border/70 bg-background/60 p-1">
            {PERIODS.map((value) => (
              <Button
                key={value}
                variant={period === value ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setPeriod(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Latest share price</p>
            <p className="mt-1 font-semibold">{formatMicrostx(BigInt(Math.max(1, Math.round(lastValue))))}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Return since inception</p>
            <p className="mt-1 font-semibold text-emerald-300">{formatPercent(totalReturn)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">First point</p>
            <p className="mt-1 font-semibold">{formatVaultDate(series[0]?.timestamp ?? null)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-bitcoin-500/10 to-background/80 p-3">
          <svg viewBox="0 0 100 100" className="h-72 w-full" role="img" aria-label="Vault share price chart">
            <defs>
              <linearGradient id="vault-performance-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(247 147 26 / 0.35)" />
                <stop offset="100%" stopColor="rgb(247 147 26 / 0)" />
              </linearGradient>
            </defs>
            <path d={`${chartPath} L 100 100 L 0 100 Z`} fill="url(#vault-performance-fill)" />
            <path d={chartPath} fill="none" stroke="rgb(247 147 26)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
