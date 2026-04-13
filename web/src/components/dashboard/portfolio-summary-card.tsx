"use client";

import { Bitcoin, Layers3, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBtc, formatUsd } from '@/lib/dashboard-formatters';
import type { DashboardPortfolioSummary } from '@/types/dashboard';

interface PortfolioSummaryCardProps {
  summary: DashboardPortfolioSummary;
}

function Sparkline({ points }: { points: DashboardPortfolioSummary['performance30d'] }): JSX.Element {
  if (points.length === 0) {
    return <div className="h-16 w-full rounded-lg bg-muted/60" aria-hidden="true" />;
  }

  const values = points.map((point) => point.valueUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const line = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point.valueUsd - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full" role="img" aria-label="Portfolio value over 30 days">
      <defs>
        <linearGradient id="portfolio-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(247 147 26 / 0.45)" />
          <stop offset="100%" stopColor="rgb(247 147 26 / 0)" />
        </linearGradient>
      </defs>
      <path d={`${line} L 100 100 L 0 100 Z`} fill="url(#portfolio-gradient)" />
      <path d={line} fill="none" stroke="rgb(247 147 26)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PortfolioSummaryCard({ summary }: PortfolioSummaryCardProps): JSX.Element {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardDescription>Portfolio Overview</CardDescription>
        <CardTitle className="font-[var(--font-display)] text-2xl sm:text-3xl">{formatUsd(summary.totalAumUsd)}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-3 sm:gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">AUM (USD)</p>
            <p className="mt-1 text-base font-semibold">{formatUsd(summary.totalAumUsd)}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">BTC Yield</p>
            <p className="mt-1 text-base font-semibold">{formatBtc(summary.totalYieldBtc)}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Active Vaults</p>
            <p className="mt-1 text-base font-semibold">{summary.activeVaults}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-gradient-to-b from-bitcoin-500/10 to-card p-2.5 sm:p-3">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-bitcoin-400" />
              30-day portfolio trend
            </span>
            <span className="inline-flex items-center gap-1">
              <Bitcoin className="h-3.5 w-3.5 text-bitcoin-400" />
              Yield measured in BTC
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers3 className="h-3.5 w-3.5 text-bitcoin-400" />
              {summary.activeVaults} active allocations
            </span>
          </div>
          <Sparkline points={summary.performance30d} />
        </div>
      </CardContent>
    </Card>
  );
}
