'use client';

import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { StrategyBrowserStrategy } from '@/types/strategy-browser';

interface StrategyDetailDialogProps {
  strategy: StrategyBrowserStrategy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildPath(points: StrategyBrowserStrategy['historicalPerformance']): string {
  if (points.length === 0) {
    return '';
  }

  const values = points.map((point) => point.returnPercent);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point.returnPercent - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function metricValue(value: string): JSX.Element {
  return <dd className="mt-1 font-semibold text-foreground">{value}</dd>;
}

export function StrategyDetailDialog({ strategy, open, onOpenChange }: StrategyDetailDialogProps): JSX.Element {
  const seriesPath = React.useMemo(() => buildPath(strategy?.historicalPerformance ?? []), [strategy]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border border-border/70 bg-popover p-0 sm:max-w-4xl">
        {strategy ? (
          <div className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader className="border-b border-border/70 px-5 py-4">
              <DialogDescription>Strategy details</DialogDescription>
              <DialogTitle className="font-[var(--font-display)] text-2xl">{strategy.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {strategy.strategyTypeLabel} strategy for {strategy.targetAssetSymbol} with a {strategy.riskLabel.toLowerCase()} risk profile.
              </p>
            </DialogHeader>

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <h3 className="font-medium text-foreground">How it works</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.detailedExplanation}</p>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <h3 className="font-medium text-foreground">Execution conditions</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {strategy.executionConditions.map((condition) => (
                      <li key={condition} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-bitcoin-400" aria-hidden="true" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <h3 className="font-medium text-foreground">Fee structure</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.feeStructure}</p>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-foreground">Historical performance</h3>
                      <p className="text-xs text-muted-foreground">Indicative backtest-style series based on strategy configuration.</p>
                    </div>
                    <span className="rounded-full border border-border/70 bg-card/70 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {strategy.estimatedApyRange}
                    </span>
                  </div>

                  {strategy.historicalPerformance.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <svg viewBox="0 0 100 100" className="h-40 w-full" role="img" aria-label="Historical return chart">
                        <defs>
                          <linearGradient id="strategy-performance-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(247 147 26 / 0.35)" />
                            <stop offset="100%" stopColor="rgb(247 147 26 / 0)" />
                          </linearGradient>
                        </defs>
                        <path d={`${seriesPath} L 100 100 L 0 100 Z`} fill="url(#strategy-performance-fill)" />
                        <path d={seriesPath} fill="none" stroke="rgb(247 147 26)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Latest return</p>
                          {metricValue(`${strategy.historicalPerformance.at(-1)?.returnPercent.toFixed(2) ?? '0.00'}%`)}
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Compatible protocols</p>
                          {metricValue(strategy.compatibleProtocols.join(', '))}
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Risk tier</p>
                          {metricValue(strategy.riskLabel)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No historical performance data is available for this strategy yet.</p>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <h3 className="font-medium text-foreground">Strategy facts</h3>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Strategy type</dt>
                      {metricValue(strategy.strategyTypeLabel)}
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Target asset</dt>
                      {metricValue(strategy.targetAssetSymbol)}
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Target APY range</dt>
                      {metricValue(strategy.estimatedApyRange)}
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Compatible protocols</dt>
                      {metricValue(strategy.compatibleProtocols.join(', '))}
                    </div>
                  </dl>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <h3 className="font-medium text-foreground">Plain-English summary</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{strategy.description}</p>
                </section>
              </aside>
            </div>

            <DialogFooter className="border-t border-border/70 px-5 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button render={<Link href={`/vaults?strategyId=${strategy.id.toString()}`} />}>
                Create Vault with This Strategy
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
