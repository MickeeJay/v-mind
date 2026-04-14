'use client';

import { ChevronRight, Layers3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { StrategyBrowserStrategy } from '@/types/strategy-browser';

interface StrategyCardProps {
  strategy: StrategyBrowserStrategy;
  onViewDetails: (strategy: StrategyBrowserStrategy) => void;
}

const RISK_STYLES: Record<string, string> = {
  Conservative: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Moderate: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Aggressive: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  Unknown: 'border-muted bg-muted/40 text-muted-foreground',
};

export function StrategyCard({ strategy, onViewDetails }: StrategyCardProps): JSX.Element {
  const riskStyle = RISK_STYLES[strategy.riskLabel] ?? RISK_STYLES.Unknown;

  return (
    <Card className="group border-border/70 bg-card/70 transition duration-200 hover:-translate-y-0.5 hover:border-bitcoin-400/40 hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>Strategy #{strategy.id.toString()}</CardDescription>
            <CardTitle className="font-[var(--font-display)] text-xl">{strategy.name}</CardTitle>
          </div>

          <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', riskStyle)}>
            {strategy.riskLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-1">
            <Layers3 className="h-3 w-3 text-bitcoin-400" />
            {strategy.strategyTypeLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-2 py-1">{strategy.targetAssetSymbol}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <p className="text-sm leading-6 text-muted-foreground">{strategy.description}</p>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Target APY</dt>
            <dd className="mt-1 font-semibold text-foreground">{strategy.estimatedApyRange}</dd>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-3">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Compatible protocols</dt>
            <dd className="mt-1 font-semibold text-foreground">{strategy.compatibleProtocols.join(', ')}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Target protocol: <span className="font-mono text-foreground">{strategy.targetProtocolPrincipal}</span>
          </div>

          <Button variant="outline" onClick={() => onViewDetails(strategy)}>
            View Details
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
